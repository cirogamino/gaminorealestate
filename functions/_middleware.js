// Host routing: office.gaminorealestate.com serves the back office; /office on the main site redirects there.
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (url.hostname.startsWith("office.")) {
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const res = await ctx.env.ASSETS.fetch(new Request(new URL("/office/", url), ctx.request));
      const out = new Response(res.body, res);
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
    return ctx.next();
  }
  // plans.gaminorealestate.com serves the first-floor options model (Claude CLP 10-28-26).
  if (url.hostname.startsWith("plans.")) {
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
    }
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/second-floor")) {
      const target = url.pathname.startsWith("/second-floor") ? "/plans/second-floor/" : "/plans/";
      const res = await ctx.env.ASSETS.fetch(new Request(new URL(target, url), ctx.request));
      const out = new Response(res.body, res);
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
    return ctx.next();
  }
  if (url.pathname === "/office" || url.pathname === "/office/" || url.pathname === "/office/index.html") {
    return Response.redirect("https://office.gaminorealestate.com/" + url.search + url.hash, 301);
  }
  return ctx.next();
}
