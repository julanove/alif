export function createQuota({ perIpPerHour, dailyUnits }) {
  const state = { day: "", usedToday: 0, hour: -1, perIp: new Map() };
  return function charge(ip, units = 1) {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const hour = Math.floor(now.getTime() / 36e5);
    if (day !== state.day) Object.assign(state, { day, usedToday: 0 });
    if (hour !== state.hour) Object.assign(state, { hour, perIp: new Map() });
    const used = state.perIp.get(ip) ?? 0;
    if (used >= perIpPerHour) throw tooMany("Too many requests, try again later");
    if (state.usedToday + units > dailyUnits) throw tooMany("Daily limit reached, try again tomorrow");
    state.perIp.set(ip, used + 1);
    state.usedToday += units;
  };
}
function tooMany(message) {
  return Object.assign(new Error(message), { status: 429 });
}
export function clientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
}
