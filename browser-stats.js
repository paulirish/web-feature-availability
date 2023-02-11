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

  var load = function (type, callback) {
    callback = callback || function () {};
    fetch('https://unpkg.com/caniuse-db/fulldata-json/data-1.0.json')
      .then(function (d) {
        return d.json();
      })
      .then(function (data) {
        parse(type, data, callback);
      });
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
