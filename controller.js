
$(document).ready(function() {
	controller = new Controller();
});

function Controller() {
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
		},
		destroyed: function() {
			window.location.reload();
		}
	});


	$("#send").click(this.sendData.bind(this));
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
			ondataopen: function(data) {},
			ondata: this.onData.bind(this),
			onremotestream: function(stream) {
				attachMediaStream($('#remotevideo').get(0), stream);
			},
			oncleanup: function() {}
		});
};

Controller.prototype.onPluginSuccess = function(plugin) {
	this.plugin = plugin;
	Janus.log("Plugin attached! (" + plugin.getPlugin() + ", id=" + plugin.getId() + ")");

	// Setup ultrasound session
	this.plugin.send({"message": {"request": "list"}, success: function(result) {
		if (result["list"] == undefined || result["list"] == null) {
			Janus.error("Response was empty");
			return;
		}

		if (!(result["list"][0]["description"] == "ULTRASOUND" && result["list"][0]["type"] == "live")) {
			Janus.error("Response was not expected");
			Janus.error(result["list"]);
			return;
		}

		this.startStream();
	}.bind(this)});

	$('#stop').click(function() {
		stopStream();
	});
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

Controller.prototype.onData = function(data) {
	console.log(data);
}

Controller.prototype.startStream = function() {
	this.plugin.send({"message": {"request": "watch", id: 1}});
}

Controller.prototype.stopStream = function() {
	this.plugin.send({"message": {"request": "stop"}});
	this.plugin.hangup();
	this.janus.destroy();
}

Controller.prototype.handleStatus = function(status) {
	if(status === 'starting')
		$('#status').removeClass('hide').text("Starting, please wait...").show();
	else if(status === 'started')
		$('#status').removeClass('hide').text("Started").show();
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

Controller.prototype.sendData = function() {
	var data = $('#datasend').val();
	this.plugin.data({
		text: data,
		error: function(reason) { bootbox.alert(reason); },
		success: function() { $('#datasend').val(''); },
	});
}