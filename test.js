
//var DELAYS = [0, 
//			  100, 200, 300, 500, 800, 1000, 1200, 1400, 1600, 1800];
var DELAYS = [0, 
			  800, 1600, 1400, 500, 100, 1800, 1200, 300, 200, 1000];
var DELAY = 0;

//var QUANTIZER = [0,
//                 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

var QUANTIZER = [0,
                 70, 20, 100, 40, 80, 60, 50, 10, 90, 30];

//var FPS = [16,
//            15, 14, 12, 10, 8, 6, 4, 2, 1, 0.5];

var FPS = [16,
            2, 15, 4, 10, 8, 0.5, 12, 1, 14, 6];

function setupTests() {
	$("select#delay").change(function() {
		DELAY = DELAYS[$(this).val()];
	});

	$("select#quality").change(function() {
		controller.sendData({"method": "QUANTIZER", "data":{"quantizer": QUANTIZER[$(this).val()]}});
	});

	$("select#framerate").change(function() {
		controller.sendData({"method": "FRAMERATE", "data":{"fps": FPS[$(this).val()]}});
	});
}
