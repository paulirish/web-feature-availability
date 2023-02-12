var BrowserStats = (function () {
  var Browser = function (key, agent) {

  };

  var Browsers = function () {
    var _agents = {};
    var _features = {};

    this.__defineGetter__('features', function () {
      return _features;
    });

    this.addBrowser = function (a, agent) {
      _agents[a] = new Browser(a, agent);
    };

    
    this.addFeature = function (feature, versions) {
      _features[feature] = versions;
    };


    this.getFeature = function (featureName) {
      return _features[featureName];
    };
  };

  var load = async function (type, callback) {
    callback = callback || function () {};

    const cP = fetch('https://unpkg.com/caniuse-db/fulldata-json/data-1.0.json').then(d => d.json());
    const aP = fetch('https://unpkg.com/caniuse-lite/data/agents.js').then(r => r.text()).then(agentsTxt => {
      // lol hack because its CJS.
      window.module = window.module || {};
      eval(agentsTxt)
      return window.module.exports;
    });
    const bvP = fetch('https://unpkg.com/caniuse-lite/data/browserVersions.js').then(r => r.text()).then(bvText => {
      // lol hack because its CJS.
      window.module = window.module || {};
      eval(bvText)
      return window.module.exports;
    });
    await Promise.all([cP, aP, bvP]).then(([data, agents, browserVersions]) => {
      data.liteAgents = agents;
      data.liteBrowserVersions = browserVersions;
      parse(type, data, callback);
    })
  };

  var browsers = new Browsers();

  var parse = function (type, data, callback) {
    var validAgents = {};
    for (var a in data.agents) {
      if (type == 'all' || type == data.agents[a].type) {
        browsers.addBrowser(a, data.agents[a]);
        validAgents[a] = true;
      }
    }

    for (var i in data.data) {
      // Remove agents that are not part of the viewed set.
      var feature = data.data[i];
      for (var a in feature.stats) {
        if (!!validAgents[a] == false) {
          feature.stats[a] = undefined;
        }
      }
      browsers.addFeature(i, feature);
    }
    browsers.featureCats = _.groupBy(browsers.features, function (t) {
      return t.categories[0];
    });

    browsers.updated = data.updated;
    browsers.origCaniuseData = data;
    browsers.liteAgents = data.liteAgents;
    browsers.liteBrowserVersions = data.liteBrowserVersions;

    callback(browsers);
  };


  var returnObject = {
    load: load,
    browsers: function (type) {
      if (!!type == false) return browsers;
      else return;
    },
  };

  Object.defineProperty(returnObject, 'browsers', {
    get: function () {
      return browsers;
    },
  });

  return returnObject;
})();
