var BrowserStats = (function() {
  var Browser = function(key, agent) {
    var _agent = agent;
    var _Share;
    this.__defineGetter__("browser", function() {
      return _;
    });

    this.__defineGetter__("share", function() {
      return _agent.usage_global;
    });

    this.getVersionShare = function(version) {
      return _agent.usage_global[version] || 0;
    }; 

    this.__defineGetter__("totalShare", function() {
      if(!!_Share == false) _Share = _.reduce(_agent.usage_global, function(memo, num){ return memo + num }, 0);
      return _Share;
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
      return { "key": key, "browserShare": _agents[ua[0]].getVersionShare(ua[1]) };
    };

    this.addFeature = function(feature, versions) {
      _features[feature] = versions;
    };

    this.getByFeature = function(features, states) {
      var output = [];
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

      var browser_vers =  _.intersection.apply(this,output);
      var self = this;
      return _.map(browser_vers, function(i) { 
        return self.getBrowser(i);
      });
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
