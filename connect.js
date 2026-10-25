<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Puzzle Blocker - Arduino</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; }
    #log { background: #f4f4f4; padding: 8px; height: 160px; overflow: auto;
           font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <h2>Arduino connection</h2>
  <p>Keep this tab open while you play. Close the Arduino IDE Serial Monitor first.</p>
  <button id="connect">Connect Arduino</button>
  <p id="status">Not connected.</p>
  <div id="log"></div>
  <script src="connect.js"></script>
</body>
</html>