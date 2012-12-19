var BrowserStats = (function() {
  var Browser = function(key, agent) {
    var _agent = agent;
    var _Share;

    Object.defineProperty(this, "browser", {
      "get": function() {
        return _agent.browser;
      }
    });

    Object.defineProperty(this, "share", {
      "get": function() {
        return _agent.usage_global;
      }
    });

    Object.defineProperty(this, "type", {
      "get": function() {
        return _agent.type;
      }
    });
    
    Object.defineProperty(this, "versionKeys", {
      "get": function() {
        var versions = [];
        for(var v in _agent.versions) {
          if(!!_agent.versions[v]) {
            versions.push(key + "+" + _agent.versions[v]);
          } 

        }
        return versions;
      }
    });

    this.getVersionShare = function(version) {
      return _agent.usage_global[version] || 0;
    }; 

    Object.defineProperty(this, "totalShare", {
      "get": function() {
        if(!!_Share == false) _Share = _.reduce(_agent.usage_global, function(memo, num){ return memo + num }, 0);
        return _Share;
      }
    });
  };

  var Browsers = function () {
    var _agents = {};
    var _features = {};

    this.__defineGetter__("features", function() {
      return _features;
    });

    this.addBrowser = function(a, agent) {
      _agents[a] = new Browser(a, agent);
    };



    this.getBrowser = function(key) {
      var ua = key.split("+");
      var agent = _agents[ua[0]];
      return { "key": key, "version": ua[1], "type": agent.type, "name": agent.browser , "browserShare": agent.getVersionShare(ua[1]) };
    };

    this.addFeature = function(feature, versions) {
      _features[feature] = versions;
    };

    this.getByFeature = function(features, states) {
      var output = [];
      if(!!features == false || features.length === 0) {
        // get every single browser and version
        var agents = [];
        for(var a in _agents) {
          agents = agents.concat(_agents[a].versionKeys);
        }
        output.push(agents); 
      }
      else {
        for(var f = 0; f < features.length; f++) {
          output.push([]);
          var feat = features[f];
          var feature = _features[feat];
          for(var b in feature.stats) {
            for(var v in feature.stats[b]) { 
              var present = feature.stats[b][v];
              if(states.indexOf(present) > -1) {
                output[f].push(b + "+" + v);
              }
            }
          }
        }
      }

      var browser_vers = _.intersection.apply(this,output);
      var self = this;
      var aggregates = _.groupBy(browser_vers, function(i) { 
        return self.getBrowser(i).name;
      });

      return _.map(browser_vers, function(i) {
        var b = self.getBrowser(i);
        b.versions = _.map(aggregates[b.name], function(r) {return r.split('+')[1]});
        b._versions = _.map(aggregates[b.name], function(r) {return parseInt(r.split('+')[1].split("-")[0])});
        return b;
      });
    };

    this.browsersByFeature = function(features, states) {
      return featuresByProperty.call(this, features, states, "name"); 
    };

    this.typesByFeature =  function(features, states) {
      return featuresByProperty.call(this, features, states, "type"); 
    };

    var featuresByProperty = function(features, states, property) {
      var supportedBy = this.getByFeature(features, states);
      return _.map(
        _.groupBy(supportedBy, function(i) { return i[property] }), 
          function(i) {
            return { 
              "name": i[0][property],
              "versions": i[0].versions,
              "since": _.min(i[0]._versions),
              "share": _.reduce(i, function(memo, r) { return memo + r.browserShare  }, 0 )
            }
          });
    };

    this.getFeature = function(featureName) {
      return _features[featureName];

    };
  }; 

  var load = function(callback) {
    callback = callback || function() {};
    $.get("data.json").success(function(data) { parse(data, callback); });
  };
 
  var browsers = new Browsers();

  var parse = function(data, callback) {
    for(var a in data.agents) {
      browsers.addBrowser(a, data.agents[a]);
    }

    for(var i in data.data) {
      browsers.addFeature(i, data.data[i]);
    }

    callback(browsers);
  };

  var intersect = function() {
    var itemCount = arguments.length;
    var items = {};
    
    for(var i in arguments) {
      // invert the list.
      var arg = arguments[i];
      for(var a in arg) {
        if(!!items[a] == false) items[a] = 0;
        items[a]++;
      }
    }
     
    var output = [];    

    for(var i in items) {
      if(items[i] == itemCount) output.push(i);
    }

    return output;
  };


  return {
    load: load,
    get browsers () { return browsers; }
  };
})();
