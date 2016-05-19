
var DELAYS = [0, 
			  100, 200, 300, 500, 800, 1000, 1200, 1400, 1600, 1800]
var DELAY = 0;

var QUANTIZER = [0,
                 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

var FPS = [16,
            15, 14, 12, 10, 8, 6, 4, 2, 1, 0.5];

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
