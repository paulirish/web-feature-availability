/* bling.js */
window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);
Node.prototype.on = window.on = function (name, fn) {
  this.addEventListener(name, fn);
};
NodeList.prototype.__proto__ = Array.prototype;
NodeList.prototype.on = NodeList.prototype.addEventListener = function (name, fn) {
  this.forEach(function (elem, i) {
    elem.on(name, fn);
  });
};

// honestly i couldn't tell you how much of this code is from me over the past 5 years and how much is kinlan's fault (https://github.com/PaulKinlan/iwanttouse.com)
// but i can tell you that the code isn't elegant
// so, i'm sorry.

//
// app
//

var bindFeatureDataList = function (features, required, onItem, sumCurrent) {
  return Object.keys(features).map(function (key) {
    return {
      id: key,
      title: BrowserStats.browsers.getFeature(key).title,
    };
  });
};


/**
 * Computes the weighted-average of the score of the list of items.
 * stolen from lighthouse
 * @param {Array<{score: number|null, weight: number}>} items
 * @return {number|null}
 */
function arithmeticMean(items) {
  // Filter down to just the items with a weight as they have no effect on score
  items = items.filter(item => item.weight > 0);
  // If there is 1 null score, return a null average
  if (items.some(item => item.score === null)) return null;

  const results = items.reduce(
    (result, item) => {
      const score = item.score;
      const weight = item.weight;

      return {
        weight: result.weight + weight,
        sum: result.sum + /** @type {number} */ (score) * weight,
      };
    },
    {weight: 0, sum: 0}
  );

  return results.sum / results.weight || 0;
}


document.on('DOMContentLoaded', function () {
  var deviceType = 'all';

  BrowserStats.load(deviceType, function (browsers) {
    var features = browsers.features;

    // Sum total usage per agent, cuz it comes broken down by version
    const agents = browsers.origCaniuseData.agents;
    Object.values(agents).forEach(agent => {
      // just a sum.
      const totalUsageForAgent = Object.values(agent.usage_global).reduce((prev, curr) => {
        return prev + curr;
      }, 0)
      if (!isFinite(totalUsageForAgent)) {
        console.warn('invalid totalUsageForAgent', totalUsageForAgent, agent);
      }
      agent.usage_global_total = totalUsageForAgent;
    });

    _.each(features, function (itm, idx) {
      itm.id = idx;
    });


    /**
     * Most recent versions first
     * TODO: computationally this is very innefficient.
     */
    function sortBrowserVersions(agentStats, agentName) {
      // this LUT provides a canonical order for all version ids, incl safari tech preview.. 
      const agentVersions = agents[agentName].versions; 

      return Object.entries(agentStats).sort(([versAStr, suppA], [versBStr, suppB]) => {
        const aIndex  = agentVersions.findIndex(v => v === versAStr);
        const bIndex  = agentVersions.findIndex(v => v === versBStr);
        return bIndex - aIndex;
      });
    }

    function getNewlySupportedRecency(feat) {
      const allBrowserStats = Object.entries(feat.stats);
      const recencyPerAgent = allBrowserStats.map(([agentName, agentStats]) => {

        const allAgentVersions = agents[agentName].versions;

        
        const sorted = sortBrowserVersions(agentStats, agentName);
        const newlySupportedVersions = sorted.filter(([vers, res], i) => {  
          const nextOlderVers = sorted[i + 1]; 
          return (nextOlderVers && nextOlderVers[1]?.startsWith('n') && res.startsWith('y'));
        });
        if (newlySupportedVersions.length > 1) {
          // Theres only 7 instances in the full dataset where this happens. 
          // This == they added support. then removed it. then added it back.
          // They all are pretty old and uninteresting (shared web workers in safari, some opera stuff.. etc)
          // So ill simplify and just take the most recent.
        }
        const mostRecentVersionThatSupports = newlySupportedVersions.at(0)?.at(0);

        // If it's unsupported then then we dont include in the weighted avg
        if (!mostRecentVersionThatSupports) {
          return {
            agentName,
            weight: 0,
            score: 0,
          }
        }

        // In this browser, it is supported.
        const index = allAgentVersions.findIndex(versStr => versStr === mostRecentVersionThatSupports);
        // Higher numbers == more recent versions
        const recencyPct = index /  allAgentVersions.length;
        return {
          agentName,
          score: recencyPct,
          // If global share is under 1% round down to zero. this is cuz fyrd has a shortcut for old browsers (like android webview)
          // where he just marks latest version as supporting and theres no real history behind it.
          // this is kinda unfair but improves data quality.
          weight: agents[agentName].usage_global_total < 1 ? 0 : agents[agentName].usage_global_total
        }
      });
      const mean = arithmeticMean(recencyPerAgent);
      return mean;
    }

    function updateShare(requiredFeatures) {
      if (!!requiredFeatures === false) return;
      return bindFeatureDataList(features, requiredFeatures, undefined, 100);
    }

    var urlFeats = getFeatureArrayFromString('');
    var shareResults = updateShare(urlFeats);
    shareResults = _.groupBy(shareResults, function (f) {
      return f.id;
    });

    // merge a few categories together
    browsers.featureCats.CSS = [...browsers.featureCats.CSS, ...browsers.featureCats.CSS3];
    delete browsers.featureCats.CSS3;
    browsers.featureCats.Other = [...browsers.featureCats.Other, ...browsers.featureCats.PNG];
    delete browsers.featureCats.PNG;

    let totalFeatures = 0;
    const hasParamAll = new URL(location.href).searchParams.has('all');
    const hasParam99 = new URL(location.href).searchParams.has('99');

    var categories = Object.keys(browsers.featureCats).sort();
    var allHTML = categories.map(function (cat) {
      const feats = browsers.featureCats[cat];

      const renamedCat = {'JS API': 'Browser APIs'}[cat] || cat;
      const titleHTML = `</ul><h3>${renamedCat}</h3><ul>`;

      // smush those results onto the objects
      feats.forEach(function (feat) {
        feat.share = shareResults[feat.id][0];
      });

      const categoryHTML = feats
        .map(feat => {
          feat.totalSupport = feat.usage_perc_a + feat.usage_perc_y;
          feat.avgRecency = getNewlySupportedRecency(feat);

          return feat;
        })
        .filter(feat => {
          // Previously i filtered for features with a chrome_id.. (as a proxy for recent stuff?) but it misses out on some stuff...
          // now we filter for obviously supported stuff (but allowlist 'JS' stuff because _developit said so.)
          if (hasParamAll) return true;
          if (hasParam99) return feat.totalSupport >= 98 && cat !== 'JS';

          return feat.totalSupport < 98 || cat === 'JS';
        })
        .sort(function (a, b) {
          return b.avgRecency - a.avgRecency;
          //return b.totalSupport - a.totalSupport;
        })
        .map(function (feat) {
          var adjustedHue = adjustHue(feat.totalSupport);
          var color = `hsla(${adjustedHue}, 100%, 42%, 1)`;

          var partialColor = `hsla(${adjustedHue}, 90%, 39.6%, 1)`;
          const fullSupportPct = feat.usage_perc_y;
          const partialSupportPct = feat.usage_perc_a;

          var pct = `${escape(
            feat.totalSupport.toLocaleString(undefined, {maximumFractionDigits: 1})
          )}%`;
          var title = feat.title
            .replace(`CSS3 `, ``)
            .replace(`CSS `, ``)
            .replace(`(rounded corners)`, ``);

          totalFeatures++;
          allfeats.push(feat);

          return `
            <li data-feature='${feat.id}'>
                <label style='border-color: ${color}' title='${title} — ${escape(feat.description)}'>
                    <a href=http://caniuse.com/#feat=${feat.id}>${title}</a>
                </label>
                <span class='pctholder ${feat.totalSupport < 30 ? 'lessThan30' : ''}'>
                    <em>${pct} - ${feat.avgRecency.toLocaleString()}</em> 
                    <span class=featpct
                        style='background-color:${color}; width: ${fullSupportPct}%'>
                    </span><span class='featpct featpct--partial'
                        style='background: repeating-linear-gradient(
                            -45deg,
                            ${color},
                            ${color} 10px,
                            ${partialColor} 10px,
                            ${partialColor} 20px
                          );
                           width: ${partialSupportPct}%'>
                    </span>
                </span>`;
        })
        .join('');

      // dont make a heading for an empty section (CSS2)
      if (!categoryHTML) return '';

      return titleHTML + categoryHTML;
    });
    $('#features').innerHTML = allHTML.join('');

    $('#search').placeholder = `Filter across ${totalFeatures.toLocaleString()} features…`;

    setupSearch();

    updateDates(browsers);
  });
});

window.allfeats = [];

function escape(str) {
  return str.replace(/'/g, '');
}

var getFeatureArrayFromString = function (str) {
  var feats = str.split(',');
  if (feats.length == 1 && feats[0] === '') return [];
  return feats;
};

function updateDates(browsers) {
  const dateOptions = {year: 'numeric', month: 'long', day: 'numeric'};
  $('#caniuse-date').textContent = new Date(browsers.updated * 1000).toLocaleDateString(
    undefined,
    dateOptions
  );
}

function setupSearch() {
  var searchInput = document.getElementById('search');

  searchInput.addEventListener('input', function () {
    document.body.classList.toggle('is-searching', searchInput.value);
  });

  new Jets({
    searchTag: '#search',
    contentTag: '#features > ul',
  });
}

function adjustHue(hue) {
  // what math this is i have NO idea
  return Math.pow(hue, 3) / 10000;
}
