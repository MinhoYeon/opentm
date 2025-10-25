class NextResponseClass {
  static json(body, init = {}) {
    const status = init.status ?? 200;
    const headers = new Headers(init.headers ?? {});
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(payload, { status, headers });
  }
}

module.exports = {
  NextResponse: NextResponseClass,
};
