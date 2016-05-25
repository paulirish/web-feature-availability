
var bindFeatureDataList = function(features, required, onItem, sumCurrent) {
    var onItem = onItem || function() {};
    var supportedByCurrent = BrowserStats.browsers.browsersByFeature(required, ["y", "y x", "a", "a x"]);
    //var sumCurrent = _.reduce(supportedByCurrent, function(memo, num){ return memo + num.share; }, 0);
    $("#featureList").html("");
    $("#free").html("");
    for(var i in features) {
    var supportedBy = BrowserStats.browsers.browsersByFeature(required.concat(i), ["y", "y x", "a", "a x"]);
var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
    var difference = (sum / sumCurrent) * 100;
    var actual = sumCurrent - sum;

    $("#featureList").append("<option value='" + i  + "'>" +  difference.toFixed(2)  + "%</option>");
    onItem({"id": i, "title": BrowserStats.browsers.getFeature(i).title, "difference": difference, "actual": sum});
    }
};

var buildAdditionalFeatures = function(item) {
    var hue = Math.round(item.difference);
    var elem = document.querySelector("li[data-feature='" + item.id  + "']");
    var span = elem.querySelector('.featpct');
    elem.querySelector('label').style["border-color"] = "hsla(" + hue + ", 100%, 42%, 1)";
    span.style['background-color'] = "hsla(" + hue + ", 100%, 42%, 1)";
    span.style['width'] = (item.difference.toFixed(0) + "%")
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
    
    $("#features")[0].innerHTML = feats.map(function(feat){
        var feat = features[feat];
        return "<li data-feature='" + feat.id + "'><label for='" + feat.id + "chk'>" + feat.title + "</label><span class=pctholder><span class=featpct></span></span>";
    }).join("");
    
    
    var updateShare = function(requiredFeatures) {
        if(!!requiredFeatures === false)  return;
        var total = BrowserStats.browsers.browsersByFeature([], ["y", "y x", "a", "a x"]);
        var supportedBy = BrowserStats.browsers.browsersByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);

        var sum = _.reduce(supportedBy, function(memo, num){ return memo + num.share; }, 0);
        var totalSum = _.reduce(total, function(memo, num){ return memo + num.share; }, 0);
        $("#share").css({"color": "hsla(" + Math.round((90 / 100) * (sum /totalSum * 100)) + ", 100%, 42%, 1)"  }).text((sum / totalSum * 100).toFixed(2));

        bindFeatureDataList(features, requiredFeatures, buildAdditionalFeatures, sum)
        // Version numbers aren't that interesting here.
    //   drawTable("#totalShare",["name", "since", "share"], supportedBy);
    //   drawPie("#totalShareChart",["name", "since", "share"], supportedBy);
        
    //   var mobileDesktopSplitData = BrowserStats.browsers.typesByFeature(requiredFeatures, ["y", "y x", "a", "a x"]);
    //   drawTable("#mobileDesktopSplit",["name", "share"], mobileDesktopSplitData); 
    //   drawPie("#mobileDesktopSplitChart",["name", "share"], mobileDesktopSplitData); 
    };



    var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
    updateShare(urlFeats);

    $(_.toArray(_.map(urlFeats, function(f) { return "input[data-feature='" + f + "']" })).join()).prop("checked", "checked"); 
    
    $("#search").on('change', function() {
        if(this.value === "") return;
        var urlFeats = getFeatureArrayFromString(window.location.hash.substring(1));
        urlFeats.push(this.value);
        $(_.toArray(_.map(urlFeats, function(f) { return "input[data-feature='" + f + "']" })).join()).prop("checked", "checked"); 
        window.location.hash = $("input:checked").map(function(val, i) { return $(i).data("feature"); }).toArray().join(",");
        this.value = ""
    });
    }); 
});

var getFeatureArrayFromString = function(str) {
    var feats = str.split(",");
    if(feats.length == 1 && feats[0] === "")  return [];
    return feats
};
