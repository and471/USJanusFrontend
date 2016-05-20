

function SnapshotController() {
	// Create offscreen canvas
	this.canvas = $("<canvas></canvas>").css("display", "none").appendTo($("body")).get(0);
}


SnapshotController.prototype.snapshot = function(video, width, height) {
	$(this.canvas).attr("width", width);
	$(this.canvas).attr("height", height);

	var context = this.canvas.getContext("2d");

	// Clear previous
	context.fillStyle = "#000";
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw image
	context.drawImage(video, 0, 0, width, height);

	return $("<img/>").attr("src", canvas.toDataURL("image/png"));
};