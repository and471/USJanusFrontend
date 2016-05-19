
$(document).ready(function() {
	controller = new Controller();
});

function Controller() {
	$("#details-toggle").click(this.toggleDetails.bind(this));
	$("#send").click(function() {
		this.sendData.apply(this, [$('#datasend').val()])
	}.bind(this));

	this.sliceControl = new RangeValueControl($("#slice-controls"));
	this.sliceControl.change(this.onSliceChanged.bind(this));

	this.RETRY_DELAY = 2000;

	Janus.init({debug: "all", callback: this.onJanusInit.bind(this)});
}

Controller.prototype.onJanusInit = function() {
	// Make sure the browser supports WebRTC
	if(!Janus.isWebrtcSupported()) {
		Janus.error("No WebRTC support... ");
		return;
	}

	var server = null;
	if(window.location.protocol === 'http:')
		server = "http://" + window.location.hostname + ":8088/janus";
	else
		server = "https://" + window.location.hostname + ":8089/janus";

	// Create session
	this.janus = new Janus({
		server: server,
		success: this.onSessionSuccess.bind(this),
		error: function(error) {
			Janus.error(error);
			Janus.error("Retrying in " + this.RETRY_DELAY + " milliseconds");
			setTimeout(function() {
				this.onJanusInit();
			}.bind(this), this.RETRY_DELAY);
			this.janus.destroy();
		}.bind(this),
		destroyed: function() {
			window.location.reload();
		}
	});

};
 
Controller.prototype.onSessionSuccess = function() {
	// Attach to ultrasound plugin
	this.janus.attach(
		{
			plugin: "plugin.ultrasound",
			success: this.onPluginSuccess.bind(this),
			error: function(error) {
				Janus.error("  -- Error attaching plugin... ", error);
			},
			onmessage: this.onPluginMessage.bind(this),
			ondataopen: function(data) {
				this.plugin.send({"message": {"request": "ready"}});
				$("#details-col").removeClass("disabled");
			}.bind(this),
			ondata: this.onData.bind(this),
			onremotestream: function(stream) {
				attachMediaStream($('#video').get(0), stream);
			},
			oncleanup: function() {}
		});
};

Controller.prototype.onPluginSuccess = function(plugin) {
	this.plugin = plugin;
	Janus.log("Plugin attached! (" + plugin.getPlugin() + ", id=" + plugin.getId() + ")");

	// Setup ultrasound session
	/*this.plugin.send({"message": {"request": "list"}, success: function(result) {
		if (result["list"] == undefined || result["list"] == null) {
			Janus.error("Response was empty");
			return;
		}

		if (!(result["list"][0]["description"] == "ULTRASOUND" && result["list"][0]["type"] == "live")) {
			Janus.error("Response was not expected");
			Janus.error(result["list"]);
			return;
		}
*/
		this.startStream();
	/*}.bind(this)});

	$('#stop').click(function() {
		stopStream();
	});*/
}

Controller.prototype.onPluginMessage = function(msg, jsep) {
	if (msg["error"] !== undefined && msg["error"] !== null) {
		stopStream();
		return;
	}

	var result = msg["result"];
	if (result !== null && result !== undefined && result["status"] !== undefined && result["status"] !== null) {
		this.handleStatus(result["status"]);
	} 
	if (jsep !== undefined && jsep !== null) {
		this.handleJSEP(jsep);
	}
}

Controller.prototype.onData = function(data_str) {
	var data = JSON.parse(data_str);
	console.log(data);

	if (data.method) {

		if (data.method === "NEW_PATIENT_METADATA") this.onNewPatientMetadata(data["data"]);
		if (data.method === "N_SLICES_CHANGED") this.onNSlicesChanged(data["data"]["nSlices"]);

	}
}

Controller.prototype.startStream = function() {
	this.plugin.send({"message": {
		"request": "watch", 
		"auth": {
			"secret": "password"
		}
	}});
}

Controller.prototype.stopStream = function() {
	this.plugin.send({"message": {"request": "stop"}});
	this.plugin.hangup();
	this.janus.destroy();
}

Controller.prototype.handleStatus = function(status) {
	if(status === 'starting')
		$('#video-status').removeClass('hide').text("Starting...").show();
	else if(status === 'started')
		$('#video-status').addClass('hide').show();
	else if(status === 'stopped')
		this.stopStream();
}

Controller.prototype.handleJSEP = function(jsep) {
	// Answer
	this.plugin.createAnswer(
		{
			jsep: jsep,
			media: { audioSend: false, videoSend: false, data: true },	// We want recvonly audio/video
			success: function(jsep) {
				this.plugin.send({"message": {"request": "start"}, "jsep": jsep});
			}.bind(this),
			error: function(error) {
				Janus.error("WebRTC error:", error);
			}
		});
}

Controller.prototype.sendData = function(data) {
	this.plugin.data({
		text: JSON.stringify(data),
		error: function(reason) { bootbox.alert(reason); },
		success: function() { $('#datasend').val(''); },
	});
}

Controller.prototype.toggleDetails = function() {
	$("#video-col").toggleClass("col-md-12").toggleClass("col-md-8");
	$("#details-col").toggle();
}

Controller.prototype.onNewPatientMetadata = function(patient) {
	$("#detail-patient-name").text(patient["name"]);
}

Controller.prototype.onNSlicesChanged = function(nSlices) {
	this.sliceControl.setVisible(nSlices > 1);

	this.sliceControl.setMinMax(-1*Math.floor(nSlices/2), Math.floor(nSlices/2));
}

Controller.prototype.onSliceChanged = function() {
	var slice = this.sliceControl.val();
	this.sendData({"method": "SET_SLICE", "data":{"slice": slice}});
}


function RangeValueControl(container) {
	this.container = container;

	this.container.addClass("range-value-control");

	this.range = $("<input type='range'/>").appendTo($(container));
	this.number = $("<input type='number'/>").appendTo($(container));

	this.range.change(this.onRangeChange.bind(this));
	this.number.change(this.onNumberChange.bind(this));

	this.range.val(0);
	this.number.val(0);

	this.changeCallback = null;
}

RangeValueControl.prototype.onRangeChange = function() {
	this.number.val(this.range.val());
	if (this.changeCallback) this.changeCallback();
}

RangeValueControl.prototype.onNumberChange = function() {
	this.range.val(this.number.val());
	if (this.changeCallback) this.changeCallback();
}

RangeValueControl.prototype.change = function(cb) {
	this.changeCallback = cb;
}

RangeValueControl.prototype.val = function() {
	return parseInt(this.number.val(), 10);
}

RangeValueControl.prototype.setMinMax = function(min, max) {
	this.number.attr("min", min).attr("max", max);
	this.range.attr("min", min).attr("max", max);
}

RangeValueControl.prototype.setVisible = function(visible) {
	if (visible) this.container.show();
	else         this.container.hide();
}
