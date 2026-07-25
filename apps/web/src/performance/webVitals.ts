export type FrontendMetric={name:string;value:number;recordedAt:string};
const metrics:FrontendMetric[]=[];
export function recordMetric(name:string,value:number){ metrics.push({name,value:Math.round(value*100)/100,recordedAt:new Date().toISOString()}); if(metrics.length>100) metrics.shift(); }
export function getFrontendMetrics(){ return [...metrics]; }
export function startFrontendMetrics(){
  window.addEventListener('load',()=>{ const nav=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined; if(nav){ recordMetric('frontend.load',nav.loadEventEnd-nav.startTime); recordMetric('frontend.domInteractive',nav.domInteractive-nav.startTime); }});
  new PerformanceObserver((list)=>list.getEntries().forEach((e)=>recordMetric(`frontend.${e.entryType}`,e.duration||e.startTime))).observe({type:'largest-contentful-paint',buffered:true});
}
