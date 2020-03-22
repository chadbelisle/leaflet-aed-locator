/* AED Locator JavaScript */
/* Chad Belisle */
/* Last updated: March 20th, 2020 */


// splash screen to welcome user with instructions and obtain current floor position in building
$.fn.center = function() {
  this.css("position", "absolute");
  this.css(
    "top",
    Math.max(
      0,
      ($(window).height() - $(this).outerHeight()) / 2 + $(window).scrollTop()
    ) + "px"
  );
  this.css(
    "left",
    Math.max(
      0,
      ($(window).width() - $(this).outerWidth()) / 2 + $(window).scrollLeft()
    ) + "px"
  );
  return this;
}; 

// blank variable to store userFloor selection and pass value as integer to addLevelControl feature
userFloor = $("#overlay").show();
$("#overlay-content")
  .show()
  .center();
$("button").click(function() {
  userFloor = parseInt($("#floorChoice").val());
  $("#overlay").hide();
});

// this alerts user placement of AED based on floor selection, user should only start app when on main floor
function advise(x) {
  switch (x.value) {
    case "-1":
      alert(
        "No AED on the lower floor, please proceed to main floor before pressing Find AED"
      );
      break;
    case "0":
      break;
    case "1":
      alert(
        "No AED on the upper floor, please proceed to main floor before pressing Find AED"
      );
      break;
  }
}

// creates a map leaflet map platform
// set focal point of map to Selkirk College Castlegar, BC at a 19 zoom
var map = L.map("map").setView([49.3121, -117.6523], 19);

// adds streets basemap layer from mapbox
newmap = L.tileLayer(
  "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
  {
    attribution:
      '&copy; <a href="https://leafletjs.com/">Leaflet</a>, &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 21,
    minZoom: 18,
    id: "mapbox.streets",
    accessToken:
      "sk.eyJ1IjoiY2hhZGJlbGlzbGUiLCJhIjoiY2sydXd5bjE5MXF2aDNvcGh1Z25zcHgzcCJ9.xbQCQeREn8WML-YVbS-pbg"
  }
).addTo(map);

// set initial locate of user, watch set to true triggers onlocationFound to rerun. setView false so it doesn't change users zoom they are in
map.locate({
  setView: false,
  watch: true,
  timeout: 20000,
  enableHighAccuracy: true,
  maxZoom: 22,
  maximumAge: 60000
});

// set initial user position to null
var user_position = null;

// this function re runs asynchronously as the user moves and will update
function onLocationFound(e) {
  //   store initial user lat long for routing later, this will be used to snap user to network
  locateLatlng = e.latlng;

  // retrieve lat and long from HTML Geolocation API and convert to a turf.js point that will be used to run the spatial analysis
  newTargetPoint = turf.point([
    Object.values(locateLatlng)[1],
    Object.values(locateLatlng)[0]
  ]);

  // calculates the nearest network point to the users location
  newNearest = turf.nearestPoint(newTargetPoint, points);

  // returns the coordinates to the nearest network point. This is now the users "start" location for the routing
  newStart = turf.points([newNearest.geometry.coordinates]);

  // custom svg marker icon - familiar blue dot
  var svg =
    '<svg height="24" width="24"><circle style="stroke:#fff;stroke-width:3;fill:#2A93EE;fill-opacity:1;opacity:1;" cx="12" cy="12" r="9" fill="" /></svg>';
  var icon = L.divIcon({
    html: svg,
    iconSize: [19, 19],
    iconAnchor: [9.5, 9.5]
  });

  // adds marker to nearest network point, this will auto update removing old marker and adding new marker on the path to the AED. note: This is not the true user location, this is the point on the network closest to the user, theoretically when following the path the user should appear on the path only. view will follow user and pan to locations without changing the zoom
  if (user_position == null) {
    user_position = L.marker(
      newStart.features[0].geometry.coordinates.reverse(),
      { icon: icon }
    ).addTo(map);
    map.setView([user_position._latlng.lat, user_position._latlng.lng], 20);
  } else {
    map.removeLayer(user_position);
    user_position = L.marker(
      newStart.features[0].geometry.coordinates.reverse(),
      { icon: icon }
    ).addTo(map);
    map.panTo([user_position._latlng.lat, user_position._latlng.lng]);
  }
}
// end of onLocationFound

// returns error message from HTML Geolocation API if users location not found
function onLocationError(e) {
  alert(e.message);
}

map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

// Floor Selection - This adds indoor floor functionality using Leaflet Indoors Plugin
// https://github.com/va2ron1/leaflet-indoor/commit/f2fb557cd738131b5b8599ff9c7d8d65f60567b6

// Adds all layers as 1 single layer selectable by level to be able to switch floors
var indoorLayer = new L.Indoor(data, {
  // style layers conditionally based on floor number, black for top and bottom and green for main floor
  style: function(feature) {
    switch (feature.properties.level) {
      case -1:
        return { color: "#2d3033" };
      case 0:
        return { color: "#2ca25f" };
      case 1:
        return { color: "#2d3033" };
    }
  },
  weight: 2,
  opacity: 0.5
});

// add event listener to select floor layer to be added based on user input from the splash screen
document.getElementById("startApp").addEventListener("click", function() {
  addLevelControl();
});

// adds UI element
function addLevelControl() {
  // set the initial level to show, this should represent the current floor that the cardiac arrest is occurring. User will select current floor and it will auto set level

  indoorLayer.setLevel(userFloor);

  indoorLayer.addTo(map);

  var levelControl = new L.Control.Level({
    level: userFloor,
    levels: indoorLayer.getLevels(),
    indoorLayer: indoorLayer
  });

  

  // change button text to lower, main and upper for each level based on returned values
  // code stored in the Leaflet.indoor.js source file, it is present in this script to show how it was done.

  // if (originalLevel == -1) {levelBtn.appendChild(levelBtn.ownerDocument.createTextNode("Lower"));}

  // if (originalLevel == 0 ) {levelBtn.appendChild(levelBtn.ownerDocument.createTextNode("Main"));}

  // if (originalLevel == 1 ) {levelBtn.appendChild(levelBtn.ownerDocument.createTextNode("Upper"));}

  levelControl.addTo(map);
  getUserCoord();
}
// end addLevelControl

// ROUTING CAPABILITY

// If user selects main floor as current location, the routing function will load and direct user from current location to the nearest AED. If user selects basement or upper floor, instructions to locate nearest staircase and ascend or descend a level and then start app

// Takes geolocation coordinates for user and returns a target point that will be used to calculate start point and find nearest AED
function getUserCoord() {
  // retrieve lat and long from HTML Geolocation API and convert to a turf.js point that will be used to run the spatial analysis
  targetPoint = turf.point([
    Object.values(locateLatlng)[1],
    Object.values(locateLatlng)[0]
  ]);

  // ensures targePoint has been calculated before running rest of app
  promiseTarget = new Promise(function(resolve, reject) {
    if (typeof targetPoint !== "undefined") {
      resolve(
        start(),
        finish(),
        aedroute(),
        removeDuplicate(),
        routeVertices(),
        drawRoute()
      );
    } else {
      reject(Error("user not found"));
    }
  });
}
// end of getUserCoord

// Start route location (on network node)
function start() {
  // calculates the nearest network node to the users location
  var nearest = turf.nearestPoint(targetPoint, points);

  // returns the coordinates to the nearest network node. This is now the users "start" location for the routing
  start = turf.points([nearest.geometry.coordinates]);

  return start;
}
// end start

// Finish route/AED location

// // calculates the nearest network node to the users location, and returns the nearest AED
function finish() {
  // calculates the nearest AED to the users location
  var nearest = turf.nearestPoint(targetPoint, aed_locations);

  // returns the coordinates to the nearest AED location. This is now the users finish location for the routing
  finish = turf.points([nearest.geometry.coordinates]);

  return finish;
}
// end finish

// pathfinder will find the least cost path in a topographic network. Both the start and finish points MUST share coordinates with a network node

// uses geoJSON pathfinder to calculate the shortest path. The output of the pathfinder.findPath is an object with path coordinates and a path weight(distance in metres) The coordinates are output lat long and need to be converted to long lat for leaflet

function aedroute() {
  var pathFinder = new PathFinder(geojson, { precision: 1e-8 });
  path = pathFinder.findPath(start, finish);

  return path;
}
// end aedroute

// pathfinder seems to create duplicate coordinates for one of the AED points, this causes a set of coordinates to not be reversed into the proper format. The following removes any duplicates found in the list and then creates a new object array with the coordinates for the path

var newArray = [];
var uniqueObject = {};

// there seems to be a duplicate set of coordinates returned in some cases. Following function will compile all coordinates found in the path list and push to newArray
function removeDuplicate() {
  // Loop the array elements and find all 'lat' values
  for (let i in path.path) {
    objTitle = path.path[i][0];

    // Use the 'lat' as the index
    uniqueObject[objTitle] = path.path[i];
  }

  // Loops and pushes unique objects only into array
  for (i in uniqueObject) {
    newArray.push(uniqueObject[i]);
  }
}
// removeDuplicate

// Take list of path coordinates and reverses them into proper format for the leaflet to render
function routeVertices() {
  pointList = [];

  for (a = 0; a != newArray.length; a++) {
    newArray[a].reverse();
    pointList.push(new L.latLng(newArray[a]));
  }
}
// end routeVertices

// takes the reversed coordinates and creates a Polyline from the userlocation(on the network)to the aed and displays it on the map while focusing on the route extent
function drawRoute() {
  var aedRoute = new L.Polyline(pointList, {
    color: "red",
    weight: 3,
    opacity: 1,
    smoothFactor: 1
  }).addTo(map);

  // focuses on route extent
  map.fitBounds(aedRoute.getBounds());

  // Add distance to AED to map and estimated time
  // Time calculated using the recommended time it takes to travel 100m to retrieve an AED. 100m/2min or 50m/min. Distance value is the path weight returned from the pathfinder.findPath function

  // Time = distance * 1/50
  L.Control.textbox = L.Control.extend({
    onAdd: function(map) {
      var text = L.DomUtil.create("div");
      text.id = "info_text";

      // conditional time formatting to display seconds or minutes depending on length
      if ((path.weight * 1000) / 50 <= 1.1) {
        text.innerHTML =
          "Distance to AED: " +
          Math.round(path.weight * 1000) +
          " meters" +
          " | " +
          ((path.weight * 1000) / 2.78).toFixed(0) +
          " seconds";
      } else {
        text.innerHTML =
          "Distance to AED: " +
          Math.round(path.weight * 1000) +
          " meters" +
          "<br>" +
          "Estimated Time: " +
          ((path.weight * 1000) / 50).toFixed(1) +
          " minutes";
      }

      text.style.fontWeight = "bold";
      return text;
    }
  });

  // adds time and distance calculations to the screen
  L.control.textbox = function(opts) {
    return new L.Control.textbox(opts);
  };
  L.control.textbox({ position: "topright" }).addTo(map);
}
// end of drawRoute

// Attribution
map.attributionControl.setPrefix("Created By: Chad Belisle");

// END OF SCRIPT
