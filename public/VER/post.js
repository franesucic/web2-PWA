import { set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

let mediaRecorder;
let myStream;
var myRecorder;
let allRecorded = [];
let url;

const player = document.getElementById("player");
const beforeSnap = document.getElementById("beforeSnap");
const snapName = document.getElementById("snapName");
const recordTitle = document.getElementById("recordTitle");

const startCapture = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        player.srcObject = stream;
    } catch (err) {
        alert("Media stream not working.");
        console.error(err);
    }
};

startCapture();

const videoCapture = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            const video = document.querySelector('video');
            video.srcObject = 'srcObject' in video ? stream : (video.mozSrcObject = stream);
            myStream = stream;
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
            } catch (e) {
                console.error('Error while creating MediaRecorder: ' + e);
                return;
            }
            myRecorder = mediaRecorder;
            console.log('MediaRecorder created successfully.');
            mediaRecorder.ondataavailable = dataAvailable;
            mediaRecorder.start(100);
        })
        .catch((err) => {
            console.error('Error accessing video stream: ' + err);
        });
};

const dataAvailable = (event) => {
    if (event.data.size > 0) {
        allRecorded.push(event.data);
    }
};

const stopRecording = () => {
    myRecorder.stop();
    console.log('Recording stopped');
    myStream.getTracks()[0].stop();
    const blob = new Blob(allRecorded, { type: "video/webm" });
    url = (window.URL || window.webkitURL).createObjectURL(blob);
};

document.getElementById("btnRecord").addEventListener("click", () => {
    addNewSnap();
    videoCapture();
});

const addNewSnap = () => {
    recordTitle.innerHTML = "Recording...";
    const btnRecord = document.getElementById("btnRecord");
    btnRecord.remove();
    const stopDiv = document.getElementById("stopDiv");
    const stopButton = document.createElement("button");
    stopButton.id = "btnSnap";
    stopButton.innerHTML = '<span> Stop</span>';
    stopButton.addEventListener("click", () => {
        stopRecording();
        recordTitle.innerHTML = "Recording stopped";
    });
    beforeSnap.appendChild(stopButton);
    stopDiv.appendChild(stopButton);
};

const addNewRecord = () => {
    const btnSnap = document.getElementById("btnSnap");
    btnSnap.remove();
    const recordDiv = document.getElementById("recordDiv");
    const recordButton = document.createElement("button");
    recordButton.id = "btnRecord";
    recordButton.innerHTML = '<span> Start recording</span>';
    recordButton.addEventListener("click", () => {
        addNewSnap();
        videoCapture();
    });
    beforeSnap.insertBefore(recordButton, recordTitle);
    recordDiv.appendChild(recordButton);
};

document.getElementById("btnUpload").addEventListener("click", function(event) {
    event.preventDefault();

    if(!snapName.value.trim()) {
        alert("You need to type something.");
        return false;
    }

    recordTitle.innerText = "Video uploaded."

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