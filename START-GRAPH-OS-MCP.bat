@echo off
echo Starting Graph-OS MCP Server with SSE Transport...
echo.
echo Host: 10.37.247.247
echo Port: 8084
echo.
echo This provides a native MCP transport for Dify and other cloud clients.
echo URL: http://10.37.247.247:8084/sse
echo.

cd packages\mcp-tools
npx ts-node src/bin/server.ts --host=10.37.247.247 --port=8084 --debug

echo.
echo Server stopped.
pause
