web-feature-distribution
============

i hacked up https://github.com/PaulKinlan/iwanttouse.com real good.

### dev

run a local server and open index.html


#### ~update data~ (not needed anymore)

I used to serve the data locally, but now i just hotlink the data from unpkg which always keeps it up to date. 

```sh
git -C caniuse pull origin main
cp caniuse/fulldata-json/data-1.0.json data.json
```
