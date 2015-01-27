	//We'll initialize in London, because it is far away from Milwaukee. 
	var url = ""; 
	var request = new XMLHttpRequest();
	var debugLocation = false;
	var debugUrl = false;
	var unitString = "imperial"; //Default to Imperial units, as most of our end users at Corvisa likely prefer it.
	var unitDisplay = "° F"; //How temperature units will be displayed
	var numDaysToForecast = 0; //Number of days to forecast
	var savedPosition = {}; //Stores position data to access outside of callback functions
	var weatherActive = {}; //Same for weather
	//Used to make intuitive forecasting date display:
	var date = new Date();
	var weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday",
	"Friday","Saturday"]
	var cachedWeather = []; //Store weather data to cut down on api pings.
	var dayToday = weekdays[date.getDay()];
	var dateToday = date.getDate();
	var monthToday = date.getMonth();
	//var avg; //we're going to average the morning, day, evening, and night temps to get an average temp and add it into the forecast data.
	var textBox = {}
	var appIdString = ""//"&APPID=9006d05a589c4fa48d3f4eae5fa93adc" //This App's ID.
				
	//these two functions are used to make the city search grey out and to make it
	//more clear that the text box is not being used for search.
		
	function trim (str) {
		return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}

	$( document ).ready( function() {
		$("#searchForm").submit(function() {
			loadWeatherData();
			return false;
		});		
		loadGeoData();
		//these two functions are used to make the city search grey out and to make it
		//more clear that the text box is not being used for search.				
		$("#citySearch").focus( function(){
			var i = this;		
			if(this.className.indexOf(" blur") > -1){
				$("#citySearch").removeClass("blur");
			}
			i.className+=" focus";
			if(i.value === i.defaultValue){ i.value="";}
		})
		$("#citySearch").blur( function(){		
			var i = this;
			if(this.className.indexOf(" focus") > -1){						
				$("#citySearch").removeClass("focus");
			}
			i.className+=" blur";
			if(trim(i.value) === ""){ i.value=i.defaultValue;}
		})
	})		
		
	//If we're going to be asking for location data we should do it immediately:	
	
			
	function loadGeoData() {
	// We need to check if the browser has the correct capabilities.
		textBox = document.getElementById("citySearch");
		if (textBox.value !== textBox.defaultValue){
			loadWeatherData();
			return;
		}								
		if (debugLocation){
			document.getElementById("georesults").className = "activeGeo";
		}

		if (navigator.geolocation) {
			// If so, get the current position and feed it to exportPosition
			// (or errorPosition if there was a problem)
			navigator.geolocation.getCurrentPosition(exportPosition, errorPosition);

		} else {
			// If the browser isn't geo-capable, tell the user.
			document.getElementById("georesults").innerHTML = ('<p>Your browser does not support geolocation.</p>');

		}

		function errorPosition() {
			document.getElementById("georesults").innerHTML = ('<p>The page could not get your location.</p>');
		}

		function exportPosition(position) {									
			savedPosition = position;
			loadWeatherData(); //any time we want to refresh our position we'll also want to refresh the weather data.	
			if (debugLocation){
				document.getElementById("georesults").innerHTML = 
					'<div id="map_canvas"></div>' +
					'<p>' 
							+ 'Latitude: ' + position.coords.latitude + '<br />'
							+ 'Longitude: ' + position.coords.longitude + '<br />'
							+ 'Accuracy: ' + position.coords.accuracy + '<br />'
							+ 'Altitude: ' + position.coords.altitude + '<br />'
							+ 'Altitude accuracy: ' + position.coords.altitudeAccuracy + '<br />'
							+ 'Heading: ' + position.coords.heading + '<br />'
							+ 'Speed: ' + position.coords.speed + '<br />'
					+ '</p>'
				;					
				googleMapShow(
									position.coords.latitude,
									position.coords.longitude,
									{maximumAge:600000});
			}
		}

		function googleMapShow(latitude,longitude) {
			var latlng = new google.maps.LatLng(latitude, longitude);
			var myOptions = {
				zoom: 14,
				center: latlng,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
		var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
		}
	}
						
	function loadWeatherData(){
		setUrl();
		if(!checkCache()){				
			request.open('GET', url, true);
			request.onload = function() {
			  if (request.status >= 200 && request.status < 400) {
				// Success!
				weatherActive = JSON.parse(request.responseText);
				setCache();
				showWeather();
			  } else {
				// We reached our target server, but it returned an error
				 document.getElementById("tempDisplay").innerHTML = "There was an error connecting to the weather server.";
			  }
			};
			request.onerror = function() {
			  // There was a connection error of some sort
			  document.getElementById("tempDisplay").innerHTML = "There was a connection error :(.";
			};
		}
		
		function setUrl(){ 
			if (!savedPosition && textBox.value === textBox.defaultValue){
			document.getElementById("h01").innerHTML = "Please enter or share a location";
			}
			if (document.getElementById("degC").checked) {
				unitString = "metric";				
				unitDisplay = "° C";	
			}
			else {
				unitString = "imperial";		
				unitDisplay = "° F";	
			}
			if (unitString !== "metric" && unitString !== "imperial"){
			//This will never evaluate to true in this incarnation, but may save headaches in the future.
				document.getElementById("tempDisplay").innerHTML = 'Something has gone wrong with temperature units, "' + unitString + '" is not valid.';
			}
			if (textBox.value === textBox.defaultValue && savedPosition){
				var positionUrl = "lat=" + savedPosition.coords.latitude + "&lon=" + savedPosition.coords.longitude;
			}
			else {
				var positionUrl = "q=" + textBox.value + "&mode=json";
			}
			var unitsUrl = "&units=" + unitString;
			if (numDaysToForecast === 0) { //if we just want current weather go for it.
				url = "http://api.openweathermap.org/data/2.5/weather?" + positionUrl + unitsUrl + appIdString;
			}
			else { //otherwise just grab the daily, and all 14 of them. We will prune what we show later for 5-day.
				url = "http://api.openweathermap.org/data/2.5/forecast/daily?" + 
				positionUrl + unitsUrl + "&cnt=14" + appIdString;					
			}
			if (debugUrl){
				document.getElementById("urlDiv").innerHTML = url;
				document.getElementById("urlDiv").className = "center";
			}
		}
		
		function checkCache(){
			for (i = 0; i < cachedWeather.length; i++){
				if (cachedWeather[i].url === url){
					weatherActive = cachedWeather[i].weather;
					showWeather();
					return true;
				}
			}
		}
		
		function setCache(){
		
		}
		
		function showWeather(){				
			$(".generated").remove();					
			if(verifyResponse()) {
				if (numDaysToForecast === 0){
					displayCurrentWeather();
				}
				else{
					for (i = 0; i <= numDaysToForecast; i++){
						display1DayWeather(i);
					}
				}
			}				
		}
		
		function verifyResponse(){
			if (weatherActive.cod >= 200 && weatherActive.cod < 400 ){ 
				setHeadline();
				return true;						
			}
			else if (weatherActive.cod === "404"){
				document.getElementById("h01").innerHTML = "This city does not seem to exist. Please try again.";
				return false;
			}
			else {
				return false;
			}
		}
		
		function setHeadline(){
			function toTitleCase(str){
					if(str.charAt(0)){
						return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
					}
				}
			var startOfHeadline = "Weather in ";
			var capsSearchString = toTitleCase($("#citySearch").val());
			if (numDaysToForecast === 0) {
				if (!weatherActive.name){ //if the search was not for a city, use the search text for the headline
					document.getElementById("h01").innerHTML = startOfHeadline + capsSearchString			
				}
				else{
					document.getElementById("h01").innerHTML = startOfHeadline + weatherActive.name;
				}
			}
			else {
				if (!weatherActive.city.name){
					document.getElementById("h01").innerHTML = startOfHeadline + capsSearchString;						
				}
				else{
					document.getElementById("h01").innerHTML = startOfHeadline + weatherActive.city.name;
				}
			}
		}	
			
		function displayCurrentWeather(){				
			$("#weatherData").append (
			'<div class="weatherDay generated">' +
				'<div class="center day generated">'+ dayToday + '<br> </div>' +
				'<div class="center date generated">'+ (monthToday + 1) + '/' + dateToday  + '</div>' +
				'<div class="center temp generated">' + parseInt(weatherActive.main.temp, 10) + unitDisplay + '</div>' +
				'<div class="center description generated">' + weatherActive.weather[0].description + '</div>' +
			'</div>'
			);					
		}
		
		function display1DayWeather(dateIndex){ //A helper function to write an entire day's worth of weather data.
			date = new Date();
			date.setDate(date.getDate() + dateIndex);
			var temp = weatherActive.list[dateIndex].temp;
			weatherActive.list[dateIndex].temp.avg = parseInt((temp.day + temp.eve + temp.morn + temp.night, 10) / 4);
			$("#weatherData").append (
			'<div class="weatherDay generated '+weatherActive.list[dateIndex].weather[0].main+'">' +
				'<div class="center day generated">'+ weekdays[date.getDay()] + '<br>' + '</div>' +
				'<div class="center date generated">' + (date.getMonth() + 1) +'/' + date.getDate() + '</div>' +
				'<div class="center temp generated">' + parseInt(weatherActive.list[dateIndex].temp.avg, 10) + unitDisplay + '</div>' +
				'<div class="center minmax generated">' +
					parseInt(weatherActive.list[dateIndex].temp.max, 10) + unitDisplay +
					' / ' + 
					parseInt(weatherActive.list[dateIndex].temp.min, 10) + unitDisplay +
				'</div>' +
				'<div class="center description generated">' + weatherActive.list[dateIndex].weather[0].main + '</div>' +
			'</div>'
			);
			if (i !== numDaysToForecast) {
				$("#weatherData").append ( 
				'<br class="generated">'
				)
			}
		}
		
		request.send();
	}		