
var bindFeatureDataList = function(features, required, onItem, sumCurrent) {
    var onItem = onItem || function() {};
    var supportedByCurrent = BrowserStats.browsers.browsersByFeature(required, ["y", "y x", "a", "a x"]);
    //var sumCurrent = _.reduce(supportedByCurrent, function(memo, num){ return memo + num.share; }, 0);
    
    return Object.keys(features).map(function(key){
        var supportedBy = BrowserStats.browsers.browsersByFeature(required.concat(key), ["y", "y x", "a", "a x"]);
        var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
        var difference = (sum / sumCurrent) * 100;
        var actual = sumCurrent - sum;

        return buildAdditionalFeatures({
            "id": key, 
            "title": BrowserStats.browsers.getFeature(key).title, 
            "difference": difference, 
            "actual": sum
        });
    })
};

var buildAdditionalFeatures = function(item) {
    var hue = Math.round(item.difference);
    var pct = item.difference.toFixed(0) + "%";
    return {
        id: item.id,
        title: item.title,
        difference: item.difference,
        actual: item.actual, 
        hue: hue, 
        pct: pct };

    var liElem = document.querySelector("li[data-feature='" + item.id  + "']");
    var span = liElem.querySelector('.featpct');
    var label = liElem.querySelector('label')
    label.style["border-color"] = "hsla(" + hue + ", 100%, 42%, 1)";
    span.style['background-color'] = "hsla(" + hue + ", 100%, 42%, 1)";
    span.style['width'] = pct;
    span.textContent = item.difference.toFixed(0) + "%";
}

$(function() {
    var deviceType = "all";
    deviceType = window.location.host.indexOf("onmobile") == 0 ? "mobile": deviceType;
    deviceType = window.location.host.indexOf("ondesktop") == 0 ? "desktop": deviceType;
        $("#charts").addClass(deviceType);
        $("#usertype").text(deviceType);

    BrowserStats.load(deviceType, function(browsers) {
    var features = browsers.features;
    _.each(features, function(itm, idx) { itm.id = idx });
    var feats = _.sortBy(_.keys(features), function(itm) { return itm; });


    
    function updateShare(requiredFeatures) {
        if(!!requiredFeatures === false)  return;
        var total = BrowserStats.browsers.browsersByFeature([], ["y", "y x", "a", "a x"]);
        var supportedBy = BrowserStats.browsers.browsersByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);

        var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
        var totalSum = _.reduce(total, function(memo, num){ return memo + num.share; }, 0);
        $("#share").css({"color": "hsla(" + Math.round((90 / 100) * (sum /totalSum * 100)) + ", 100%, 42%, 1)"  }).text((sum / totalSum * 100).toFixed(2));

        return bindFeatureDataList(features, requiredFeatures, undefined, sum)
        // Version numbers aren't that interesting here.
    //   drawTable("#totalShare",["name", "since", "share"], supportedBy);
    //   drawPie("#totalShareChart",["name", "since", "share"], supportedBy);
        
    //   var mobileDesktopSplitData = BrowserStats.browsers.typesByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);
    //   drawTable("#mobileDesktopSplit",["name", "share"], mobileDesktopSplitData); 
    //   drawPie("#mobileDesktopSplitChart",["name", "share"], mobileDesktopSplitData); 
    };


    var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
    var shareResults = updateShare(urlFeats);
    shareResults = _.groupBy(shareResults, f => f.id );

    var categories = Object.keys(browsers.featureCats).sort();
    var allHTML = categories.map(function(cat){
        var feats = browsers.featureCats[cat];
        var titleHTML = '</ul><h3>' + cat + '</h3><ul>';

        // smush those results onto the objects
        feats.forEach(feat => { feat.share = shareResults[feat.id][0]; });

        var categoryHTML = feats
        .sort((a, b) => b.share.difference - a.share.difference)
        .map(function(feat){
            var color = "hsla(" + feat.share.hue + ", 100%, 42%, 1)";
            var pct = feat.share.pct;
            var title = feat.title
                .replace('CSS3 ','')
                .replace('(rounded corners)','')

            return "" + 
            "<li data-feature='" + feat.id + "'>" +
            "<label style='border-color: " + color  + "' title='" + feat.description + "'>" + title + "</label>" + 
            "<span class=pctholder>" + 
                "<span class=featpct style='background-color:" + color + "; width: " + pct + "'>" + pct + "</span>" + 
            "</span>";
        }).join("");

        return titleHTML + categoryHTML;
    })
    $("#features")[0].innerHTML = allHTML;
    
    
    }); 
});

var getFeatureArrayFromString = function(str) {
    var feats = str.split(",");
    if(feats.length == 1 && feats[0] === "")  return [];
    return feats
};
