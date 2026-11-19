// Pranešimų darbuotojas: rodo telefono pranešimą su garsu ir vibracija
self.addEventListener("push", (event) => {
  let d = { title: "Vaikų pavėžėjimas", body: "Naujas pranešimas", url: "/savininkas" };
  try { d = { ...d, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, renotify: true, requireInteraction: true, silent: false,
    vibrate: [200, 100, 200], icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/savininkas";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return clients.openWindow(url);
  }));
});
