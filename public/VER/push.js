let btnNotif = document.getElementById("btnEnableNotifications");

if("Notification" in window && "serviceWorker" in navigator) {
    btnNotif.addEventListener("click", function() {
        Notification.requestPermission(async function(res) {
            console.log("Requested permission:", res);
            if(res === "granted") {
                await setupPushSubscription();
            } else {
                console.log("Push notifications denied:", res);
            }
        });
    });
} else {
    btnNotif.setAttribute("disabled", "");
    btnNotif.classList.add("btn-outline-danger");
}

function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

async function setupPushSubscription() {
    try {
        let reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        
        if(sub === null) {
            var publicKey = "BFQ64VeSgGRHwvCxGDPMC__apaVMlEL7Ne0gf2xTCJj3oQHgHaCAjHtXDsNVc_YK_5fivGdl4X5ykHIUIZRzXHA";
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            let res = await fetch("/saveSubscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ sub })
            });

            if(res.ok) {
                alert("Subscription succesfully saved:\n" + JSON.stringify(sub));
            }
        } else {
            alert("You are already subscribed:\n" + JSON.stringify(sub));
        }
    } catch(error) {
        console.log(error);
    }
}