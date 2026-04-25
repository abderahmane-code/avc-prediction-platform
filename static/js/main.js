function init() {
  "use strict";

  // Sidebar toggle (mobile)
  var menuBtn = document.querySelector(".topbar__menu");
  var sidebar = document.querySelector(".sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--open");
    });
  }

  // Performance chart
  var canvas = document.getElementById("models-performance-chart");
  if (!canvas || typeof Chart === "undefined") return;

  var data = Array.isArray(window.__AVC_MODELS__) ? window.__AVC_MODELS__ : [];
  if (!data.length) return;

  var labels = data.map(function (m) { return m.name; });

  var palette = {
    accuracy:  "#2563eb",
    precision: "#0d9488",
    recall:    "#8b5cf6",
    f1:        "#f59e0b",
    roc:       "#ef4444",
  };

  function series(key, color) {
    return {
      label: key === "roc" ? "ROC-AUC" : key.charAt(0).toUpperCase() + key.slice(1),
      data: data.map(function (m) {
        var v = m[key === "roc" ? "roc_auc" : key];
        return v == null ? 0 : v;
      }),
      backgroundColor: color,
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.8,
      categoryPercentage: 0.72,
    };
  }

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        series("accuracy",  palette.accuracy),
        series("precision", palette.precision),
        series("recall",    palette.recall),
        series("f1",        palette.f1),
        series("roc",       palette.roc),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 12 } },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { weight: "600" },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              return ctx.dataset.label + ": " + (ctx.parsed.y).toFixed(3);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 1,
          grid: { color: "#e2e8f0" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback: function (v) { return v.toFixed(2); },
          },
        },
      },
    },
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
