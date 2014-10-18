/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function createRenderer(canvasId, URL) {
  var canvas = document.getElementById(canvasId);
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABGdBTUEAALGPC/xhBQAAAAZQTFRF8PDwAAAAfqfmLAAAAAJ0Uk5TzAAR3FV6AAAAFElEQVQI12NgsP/AQAz+f4CBGAwAJIIdTTn0+w0AAAAASUVORK5CYII=)';

  var camera = {
    x: 0,
    y: 0,
    scale: 1,
  };

  function draw() {
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    if (pageCanvas != null) {
      ctx.scale(1/pageCanvasView.scale, 1/pageCanvasView.scale);
      ctx.translate(-pageCanvasView.x, -pageCanvasView.y);

      ctx.drawImage(pageCanvas, 0, 0);
    }
  }

  var dragStart = null;
  canvas.addEventListener('mousedown', function(e) {
      dragStart = [e.clientX, e.clientY];

  });
  canvas.addEventListener('mousemove', function(e) {
    if (dragStart != null) {
      camera.x += e.clientX - dragStart[0];
      camera.y += e.clientY - dragStart[1];
      dragStart = [e.clientX, e.clientY];
      draw();
    }
  });
  document.addEventListener('mouseup', function(e) {
    dragStart = null;
    // draw();
    rerenderPdf();
  });

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var v = e.wheelDelta || -e.deltaY;
    var delta = 1 + (Math.abs(v) * 0.001);
    if (v < 0) {
      delta = 1/delta;;
    }
    
    // camera.x = camera.x * delta;
    // camera.y = camera.y * delta;
    var mx = e.clientX - (canvas.offsetLeft + canvas.clientLeft);
    var my = e.clientY - (canvas.offsetTop + canvas.clientTop);
    camera.x = (-mx * (delta - 1)) + delta * camera.x;
    camera.y = (-my * (delta - 1)) + delta * camera.y;
    camera.scale *= delta;
    draw();
    rerenderPdf();
  });


  var pageCanvas = document.createElement('canvas');
  var pageCanvasView = { scale: 1, x:0, y:0 };
  var pageRendering = false;
  var pageRenderingStart = 0;
  var pdfObject = null;


  PDFJS.getDocument(URL).then(function(pdf) {
    pdf.getPage(1).then(function(page) {
      pdfObject = page;
      rerenderPdf();
    });
  });

  function rerenderPdf() {
    if (pageRendering || pdfObject == null) {
      return;
    }
    pageRendering = true;
    pageRenderingStart = window.performance.now();
    renderPage(pdfObject, function() {
      pageRendering = false;
      document.getElementById('time').textContent = Math.round(window.performance.now() - pageRenderingStart) + " ms";
      draw();
      if (pageCanvasView.scale != camera.scale) {
        setTimeout(rerenderPdf, 0);
      }
    });
  }

  var scratchCanvas = document.createElement('canvas');
  function renderPage(page, callback) {
      var viewport = page.getViewport(1);
      // var scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
      viewport = page.getViewport(camera.scale);

      var drawnView = {
        scale: camera.scale,
        x: camera.x,
        y: camera.y,
      };
      scratchCanvas.width = canvas.width;
      scratchCanvas.height = canvas.height;
      var context = scratchCanvas.getContext('2d');

      viewport.transform[4] += drawnView.x;
      viewport.transform[5] += drawnView.y;
      var renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      var renderTask = page.render(renderContext);
      renderTask.promise.then(function() {
        if (drawnView.scale != camera.scale) {
          callback();
          return;  
        }
        pageCanvasView = drawnView;
        pageCanvas.width = scratchCanvas.width;
        pageCanvas.height = scratchCanvas.height;
        var c = pageCanvas.getContext('2d');
        c.drawImage(scratchCanvas, 0, 0);
        callback();
      });
  }
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var URL = 'pest.pdf';
var param = getParameterByName('file');
if (param != '') {
  URL = param;
}
else if (location.search.indexOf('?pdf-a') == 0) {
  URL = 'qcm_6e_13_FR.pdf';
}
else if (location.search.indexOf('?pdf-b') == 0) {
  URL = 'compressed.tracemonkey-pldi-09.pdf';
}
else if (location.search.indexOf('?pdf-c') == 0) {
  URL = 'Diagram.pdf';
}

createRenderer('the-canvas', URL);
