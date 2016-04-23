// We make use of this 'server' variable to provide the address of the
// REST Janus API. By default, in this example we assume that Janus is
// co-located with the web server hosting the HTML pages but listening
// on a different port (8088, the default for HTTP in Janus), which is
// why we make use of the 'window.location.hostname' base address. Since
// Janus can also do HTTPS, and considering we don't really want to make
// use of HTTP for Janus if your demos are served on HTTPS, we also rely
// on the 'window.location.protocol' prefix to build the variable, in
// particular to also change the port used to contact Janus (8088 for
// HTTP and 8089 for HTTPS, if enabled).
// In case you place Janus behind an Apache frontend (as we did on the
// online demos at http://janus.conf.meetecho.com) you can just use a
// relative path for the variable, e.g.:
//
// 		var server = "/janus";
//
// which will take care of this on its own.
//
//
// If you want to use the WebSockets frontend to Janus, instead, you'll
// have to pass a different kind of address, e.g.:
//
// 		var server = "ws://" + window.location.hostname + ":8188";
//
// Of course this assumes that support for WebSockets has been built in
// when compiling the gateway. WebSockets support has not been tested
// as much as the REST API, so handle with care!
//
//
// If you have multiple options available, and want to let the library
// autodetect the best way to contact your gateway (or pool of gateways),
// you can also pass an array of servers, e.g., to provide alternative
// means of access (e.g., try WebSockets first and, if that fails, fall
// back to plain HTTP) or just have failover servers:
//
//		var server = [
//			"ws://" + window.location.hostname + ":8188",
//			"/janus"
//		];
//
// This will tell the library to try connecting to each of the servers
// in the presented order. The first working server will be used for
// the whole session.
//
var server = null;
if(window.location.protocol === 'http:')
	server = "http://" + window.location.hostname + ":8088/janus";
else
	server = "https://" + window.location.hostname + ":8089/janus";

var janus = null;
var streaming = null;

$(document).ready(function() {
	// Initialize the library (all console debuggers enabled)
	Janus.init({debug: "all", callback: function() {

		// Make sure the browser supports WebRTC
		if(!Janus.isWebrtcSupported()) {
			Janus.error("No WebRTC support... ");
			return;
		}

		// Create session
		janus = new Janus(
			{
				server: server,
				success: function() {
					// Attach to streaming plugin
					janus.attach(
						{
							plugin: "janus.plugin.streaming",
							success: function(pluginHandle) {
								streaming = pluginHandle;
								Janus.log("Plugin attached! (" + streaming.getPlugin() + ", id=" + streaming.getId() + ")");

								// Setup streaming session
								checkStreams();

								$('#stop').click(function() {
									stopStream();
								});
							},
							error: function(error) {
								Janus.error("  -- Error attaching plugin... ", error);
							},
							onmessage: function(msg, jsep) {
								Janus.debug(" ::: Got a message :::");
								Janus.debug(JSON.stringify(msg));
								var result = msg["result"];
								if(result !== null && result !== undefined) {
									if(result["status"] !== undefined && result["status"] !== null) {
										handle_status(result["status"]);
									}
								} else if(msg["error"] !== undefined && msg["error"] !== null) {
									stopStream();
									return;
								}
								if(jsep !== undefined && jsep !== null) {
									handle_jsep(jsep);
								}
							},
							onremotestream: function(stream) {
								Janus.debug(" ::: Got a remote stream :::");
								Janus.debug(JSON.stringify(stream));
								attachMediaStream($('#remotevideo').get(0), stream);
							},
							oncleanup: function() {
								Janus.log(" ::: Got a cleanup notification :::");
								$('#waitingvideo').remove();
								$('#remotevideo').remove();
							}
						});
				},
				error: function(error) {
					Janus.error(error);
				},
				destroyed: function() {
					window.location.reload();
				}
			});
			
	}});
});

function checkStreams() {
	streaming.send({"message": {"request": "list"}, success: function(result) {

		if (result["list"] == undefined || result["list"] == null) {
			Janus.error("Response was empty");
			return;
		}

		if (!(result["list"][0]["description"] == "ULTRASOUND" && result["list"][0]["type"] == "live")) {
			Janus.error("Response was not expected");
			Janus.error(result["list"]);
			return;
		}

		startStream();
	}
  });
}

function startStream() {
	streaming.send({"message": {"request": "watch", id: 1}});
}

function stopStream() {
	streaming.send({"message": {"request": "stop"}});
	streaming.hangup();
	janus.destroy();
}

function handle_status(status) {
	if(status === 'starting')
		$('#status').removeClass('hide').text("Starting, please wait...").show();
	else if(status === 'started')
		$('#status').removeClass('hide').text("Started").show();
	else if(status === 'stopped')
		stopStream();
}

function handle_jsep(jsep) {
	Janus.debug("Handling SDP as well...");
	Janus.debug(jsep);
	// Answer
	streaming.createAnswer(
		{
			jsep: jsep,
			media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
			success: function(jsep) {
				Janus.debug("Got SDP!");
				Janus.debug(jsep);
				streaming.send({"message": {"request": "start"}, "jsep": jsep});
				$('#watch').html("Stop").removeAttr('disabled').click(stopStream);
			},
			error: function(error) {
				Janus.error("WebRTC error:", error);
			}
		});
}