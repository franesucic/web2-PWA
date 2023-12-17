import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

var mediaRecorder;
var myStream;
var myRecorder;
var allRecorded = [];
var url;

let player = document.getElementById("player");
let beforeSnap = document.getElementById("beforeSnap");
let afterSnap = document.getElementById("afterSnap");
let snapName = document.getElementById("snapName");

let startCapture = function() {
    if(!("mediaDevices" in navigator)) {
    } else {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then((stream) => {
                player.srcObject = stream;
            })
            .catch((err) => {
                alert("Media stream not working.");
                console.log(err);
            });
    }
};

startCapture();

let videoCapture = function() {
    navigator.mediaDevices
        .getUserMedia({video: true, audio: true})
        .then(function(stream) {
            var video = document.querySelector('video');
            
            if('srcObject' in video) {
                video.srcObject = stream;
            } else if(navigator.mozGetUserMedia) {
                video.mozSrcObject = stream;
            } else {
                video.src = (window.URL || window.webkitURL).createObjectURL(stream);
            }
            myStream = stream;
            try {
                mediaRecorder = new MediaRecorder(stream, {mimeType : "video/webm"});
            } catch(e) {
                console.log('Error while creating MediaRecorder: ' + e);
                return;
            }
            
            myRecorder = mediaRecorder;
            console.log('MediaRecorder created succesfully.');
            mediaRecorder.ondataavailable = dataAvailable;
            mediaRecorder.start(100);
        })
}

function dataAvailable(event) {
    if(event.data.size == 0) return;
    allRecorded.push(event.data);
}

function stopRecording() {
    myRecorder.stop();
    console.log('Recording stopped');
    myStream.getTracks()[0].stop();
    var blob = new Blob(allRecorded, {type: "video/webm"});
    url = (window.URL || window.webkitURL).createObjectURL(blob);

}

document.getElementById("btnRecord").addEventListener("click", function(event) {
    addNewSnap();
    videoCapture();
});

function addNewSnap() {
    document.getElementById("recordTitle").innerHTML = "Recording...";
    document.getElementById("btnRecord").remove();
    let stopDiv = document.getElementById("stopDiv");
    let stopButton = document.createElement("button");
    stopButton.id = "btnSnap";
    let span = document.createElement("span");
    span.innerHTML = " Stop"
    beforeSnap.appendChild(stopButton);
    stopButton.appendChild(span);
    stopButton.addEventListener("click", function(event) {
        stopRecording();
        document.getElementById("recordTitle").innerHTML = "Recording stopped"
    });
    stopDiv.appendChild(stopButton);
}

function addNewRecord() {
    document.getElementById("btnSnap").remove();
    let recordDiv = document.getElementById("recordDiv");
    let title = document.getElementById("recordTitle");
    title.innerHTML = "";
    let recordButton = document.createElement("button");
    recordButton.id = "btnRecord";
    let span = document.createElement("span");
    span.innerHTML = " Start recording";
    beforeSnap.insertBefore(recordButton, title);
    recordButton.appendChild(span);
    recordButton.addEventListener("click", function(event) {
        addNewSnap();
        videoCapture();
    });
    recordDiv.appendChild(recordButton);
}

document.getElementById("btnUpload").addEventListener("click", function(event) {
    event.preventDefault();

    if(!snapName.value.trim()) {
        alert("You need to type something.");
        return false;
    }

    if("serviceWorker" in navigator && "SyncManager" in window) {
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => {
                let ts = new Date().toISOString();
                let id = ts + snapName.value.replace(/\s/g, "_"); // ws->_

                set(id, {
                    id,
                    ts,
                    title: snapName.value,
                    video: blob
                });
                
                return navigator.serviceWorker.ready;
            })
            .then((swRegistration) => {
                return swRegistration.sync.register("sync-snaps");
            })
            .then(() => {
                console.log("Queued for sync");
                startCapture();
            })
            .catch((error) => {
                alert(error);
                console.log(error);
            });
    } else {
        alert("TODO - vaš preglednik ne podržava bckg sync...");
    }
        
    addNewRecord();
});