[<img src="https://cdn.anychart.com/images/logo-transparent-segoe.png?2" width="234px" alt="AnyChart - Robust JavaScript/HTML5 Chart library for any project">](https://www.anychart.com)
# AnyStock - WebSocket and Stock Analysis Tools
This demo shows how to use AnyStock charts with real-time data and apply analysis tools.

## Overview
AnyStock offers a large set of features, that allow you to build your online financial portal and one of the most exciting features is the ability to draw/display on the chart so called drawing tools or, as they are called in our [documentation](https://docs.anychart.com/) and settings, annotations. Also, any financial portal should provide technical indicators to analyze chart and indicate market direction. AnyStock charts are ready to use with real-time data. All you need is to choose data vendor and preferable transfer protocol.

## Demonstrated features
* The real-time data is provided by [eodhistoricaldata](https://eodhistoricaldata.com/). The data is loaded with Secured WebSocket.
* [Technical indicators](https://docs.anychart.com/Stock_Charts/Technical_Indicators/Overview).
* [Drawing Tools and Annotations](https://docs.anychart.com/Stock_Charts/Drawing_Tools_and_Annotations/Overview). All annotations can be saved to local storage by click on `Save Annotations` button on the toolbar. This allows users to restore all annotations if the page was reloaded or theme or chart settings were changed.
* Changing theme setting on fly.

## Running

To use this sample you must have package manager for Node.js - NPM installed. If not please visit [NodeJS official site](https://nodejs.org/en/).

**To start this example run commands listed below.**
Clone the repository from github.com:
```bash
git clone git@github.com:anychart-integrations/websocket-eod-anystock-demo.git
```

Navigate to the demo folder:
```bash
cd websocket-eod-anystock-demo
```

Install dependencies:
```bash
npm install
```

Run the nodejs server which establishes a secure WebSocket connection to the data vendor EOD and forwards received data to the client side:
```bash
node server.js
```

Open browser at `http://localhost:8081/`.


## Further Learning
* [Documentation](https://docs.anychart.com)
* [JavaScript API Reference](https://api.anychart.com)
* [Code Playground](https://playground.anychart.com)
* [Technical Support](https://www.anychart.com/support)


## License
AnyStock - WebSocket and Stock Analysis Tools demo includes two parts:
- Code of the demo that allows to use Javascript library (in this case, AnyChart) with WebSocket protocol. You can use, edit, modify it, use it with other Javascript libraries without any restrictions. It is released under [Apache 2.0 License](https://github.com/anychart-integrations/python-django-mysql-template/blob/master/LICENSE).
- AnyChart JavaScript library. It is released under Commercial license. You can test this plugin with the trial version of AnyChart. Our trial version is not limited by time and doesn't contain any feature limitations. Check details [here](https://www.anychart.com/buy/).

If you have any questions regarding licensing - please contact us. <sales@anychart.com>
