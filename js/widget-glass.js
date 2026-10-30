(function () {
  'use strict';
  var nav = document.querySelector('.navbar-glass');
  if (!nav || !document.body.classList.contains('home-widget-glass')) return;
  function syncTint() {
    var style = getComputedStyle(nav);
    ['tint','edge','shadow','gloss'].forEach(function (name) {
      var value = style.getPropertyValue('--ng-' + name).trim();
      if (value) document.body.style.setProperty('--wg-' + name, value);
    });
  }
  syncTint();
  new MutationObserver(syncTint).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  var selector = [
    '.he-outside', '.ce-project', '.ct-tile', '.es-card', '.be-postcard', '.ce-footer > .container',
    '.tp-tabs', '#project.tp-ready .owl-carousel', '.fp-hardware-copy',
    '.fp-details > section:not(.fp-hardware)', '.orbit-gimbal.orbit-lab', '.sim-card', '.diy-note', '.job-script-row',
    '.ce-primary', '.ce-secondary', '.tp-tab', '.tp-arrows button', '.be-cta'
  ].join(',');
  var surfaces = Array.from(document.querySelectorAll(selector));
  surfaces.forEach(function (element) {
    element.classList.add('wg-surface');
    if (element.matches('button, .ce-primary, .ce-secondary, .be-cta')) element.classList.add('wg-button');
    if (element.matches('.ce-primary, .be-cta')) element.classList.add('wg-primary');
  });
  if (!window.ResizeObserver || !window.IntersectionObserver || !window.CSS ||
      !CSS.supports('backdrop-filter', 'url("#widget-glass")') || !/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return;
  var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width','0'); svg.setAttribute('height','0'); svg.setAttribute('aria-hidden','true');
  svg.style.position='absolute'; svg.style.pointerEvents='none';
  var defs = document.createElementNS(ns, 'defs'); svg.appendChild(defs); document.body.appendChild(svg);
  var pool = new Map(), states = new Map(), pending = new Set(), frame = 0;
  var reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
  function filterFor(width, height, radius) {
    var key = width + ':' + height + ':' + radius;
    if (pool.has(key)) return pool.get(key);
    var id = 'widget-glass-' + pool.size;
    var filter = document.createElementNS(ns,'filter');
    filter.id=id; filter.setAttribute('x','0'); filter.setAttribute('y','0'); filter.setAttribute('width','1'); filter.setAttribute('height','1');
    filter.setAttribute('filterUnits','objectBoundingBox'); filter.setAttribute('color-interpolation-filters','sRGB');
    filter.innerHTML='<feImage result="field" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="field" scale="16" xChannelSelector="R" yChannelSelector="G"/><feColorMatrix type="saturate" values="1.8"/>';
    var factor = Math.min(1, 900/width, 500/height), w=Math.max(1,Math.round(width*factor)), h=Math.max(1,Math.round(height*factor));
    var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    var context=canvas.getContext('2d');if(!context)return null;
    var pixels=context.createImageData(w,h),r=Math.min(radius*factor,w/2,h/2),band=Math.min(24*factor,r);
    if(!r||!band)return null;
    for(var y=0;y<h;y++)for(var x=0;x<w;x++){
      var dx=x-Math.max(r,Math.min(w-r,x)),dy=y-Math.max(r,Math.min(h-r,y));
      var length=Math.hypot(dx,dy),depth=r-length,strength=length&&depth>=0&&depth<band?Math.pow(1-depth/band,2)*115:0,i=(y*w+x)*4;
      pixels.data[i]=128+(length?dx/length*strength:0);pixels.data[i+1]=128+(length?dy/length*strength:0);pixels.data[i+2]=128;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);
    var field=filter.querySelector('feImage');field.setAttribute('width',width);field.setAttribute('height',height);field.setAttribute('href',canvas.toDataURL('image/png'));
    defs.appendChild(filter);pool.set(key,id);return id;
  }
  function flush() {
    frame=0;
    pending.forEach(function(element){
      var state=states.get(element);if(!state||!state.visible||reducedTransparency.matches)return;
      var rect=element.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height);
      if(!width||!height)return;
      var radius=Math.round(parseFloat(getComputedStyle(element).borderTopLeftRadius));
      var key=width+':'+height+':'+radius;
      if(state.key===key){element.classList.add('wg-optical');return;}
      var id=filterFor(width,height,radius);if(!id)return;
      element.style.setProperty('--wg-filter','url("#'+id+'")');element.classList.add('wg-optical');state.key=key;
    });
    pending.clear();
  }
  function queue(element){pending.add(element);if(!frame)frame=requestAnimationFrame(flush);}
  var intersection=new IntersectionObserver(function(entries){entries.forEach(function(entry){var state=states.get(entry.target);state.visible=entry.isIntersecting;if(state.visible)queue(entry.target);else entry.target.classList.remove('wg-optical');});},{rootMargin:'80px'});
  var resize=new ResizeObserver(function(entries){entries.forEach(function(entry){queue(entry.target);});});
  surfaces.forEach(function(element){if(element.classList.contains('wg-button'))return;states.set(element,{visible:false,key:''});intersection.observe(element);resize.observe(element);});
  reducedTransparency.addEventListener('change',function(){surfaces.forEach(function(element){if(reducedTransparency.matches)element.classList.remove('wg-optical');else queue(element);});});
})();
