import { del, entries } from "./idb-keyval.js";

const filesToCache = [
    "manifest.json",
    "/",
    "index.html",
    "offline.html",
    "404.html",
    "/assets/site.css"
];

const staticCacheName = "static-cache-v2";

self.addEventListener("install", (event) => {
    console.log("Attempting to install service worker and cache static assets");
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener("activate", (event) => {
    console.log("**************************************");
    console.log("**   Activating new service worker... **");
    console.log("**************************************");
    const cacheWhitelist = [staticCacheName];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if(cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches
            .match(event.request)
            .then((response) => {
                if(response) {
                    //return response;
                }

                return fetch(event.request).then((response) => {
                    if(response.status === 404) {
                        return caches.match("404.html");
                    }

                    return caches.open(staticCacheName).then((cache) => {
                        cache.put(event.request.url, response.clone());
                        return response;
                    });
                });
            })
            .catch((error) => {
                console.log("Error", event.request.url, error);
                return caches.match("offline.html");
            })
    );
});

self.addEventListener("sync", function(event) {
    console.log("Background sync!", event);
    if(event.tag === "sync-snaps") {
        event.waitUntil(syncSnaps());
    }
});

let syncSnaps = async function() {
    entries().then((entries) => {
        entries.forEach((entry) => {
            let snap = entry[1];
            let formData = new FormData();
            formData.append("id", snap.id);
            formData.append("ts", snap.ts);
            formData.append("title", snap.title);
            formData.append("image", snap.video, snap.id + ".webm");
            fetch("/saveSnap", {
                method: "POST",
                body: formData
            })
            .then(function(res) {
                if(res.ok) {
                    res.json().then(function(data) {
                        console.log("Deleting from idb:", data.id);
                        del(data.id);
                    });
                } else {
                    console.log(res);
                }
            })
            .catch(function(error) {
                console.log(error);
            });
        });
    });
};

self.addEventListener("notificationclick", (event) => {
    let notification = event.notification;
    notification.close();
    console.log("notificationclick", notification);
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clis) {
                if (clis && clis.length > 0) {
                    clis.forEach(async (client) => {
                        await client.navigate(notification.data.redirectUrl);
                        return client.focus();
                    });
                } else if (clients.openWindow) {
                    return clients
                        .openWindow(notification.data.redirectUrl)
                        .then((windowClient) =>
                            windowClient ? windowClient.focus() : null
                        );
                }
            })
    );
});


self.addEventListener("notificationclose", function(event) {
    console.log("notificationclose", event);
});

self.addEventListener("push", function(event) {
    console.log("push event", event);

    var data = {title: "title", body: "body", redirectUrl: "/"};

    if(event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.body,
        icon: "assets/img/android/android-launchericon-96-96.png",
        badge: "assets/img/android/android-launchericon-96-96.png",
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            redirectUrl: data.redirectUrl,
        },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});