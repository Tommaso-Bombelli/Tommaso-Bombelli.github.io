/* =========================================================
   CURSOR
========================================================= */
const dot  = document.createElement('div'); dot.className  = 'cursor-dot';
const ring = document.createElement('div'); ring.className = 'cursor-ring';
document.body.append(dot, ring);
let mx=-100,my=-100,rx=-100,ry=-100;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
(function animCursor(){
  dot.style.left=mx+'px'; dot.style.top=my+'px';
  rx+=(mx-rx)*.12; ry+=(my-ry)*.12;
  ring.style.left=rx+'px'; ring.style.top=ry+'px';
  requestAnimationFrame(animCursor);
})();

/* =========================================================
   NAV — scroll border + active section
========================================================= */
const nav = document.getElementById('nav');
const navLinks = nav ? Array.from(nav.querySelectorAll('a[data-section]')) : [];

window.addEventListener('scroll',()=>{
  if(nav) nav.classList.toggle('nav--scrolled', window.scrollY > 20);
},{passive:true});

/* Highlight nav link based on current section (homepage) */
const sections = Array.from(document.querySelectorAll('section[id]'));
if(sections.length && navLinks.length){
  const sectionObs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      navLinks.forEach(a=>{
        a.classList.toggle('active', a.dataset.section === e.target.id);
      });
    });
  },{threshold:0.3});
  sections.forEach(s=>sectionObs.observe(s));
}

/* SUB-NAV active section */
const subNav = document.getElementById('subnav');
if(subNav){
  const subLinks = Array.from(subNav.querySelectorAll('a[data-section]'));
  const subSections = Array.from(document.querySelectorAll('section[id], .erp-section[id], .hass-section[id]'));
  const subObs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      subLinks.forEach(a=>a.classList.toggle('active', a.dataset.section===e.target.id));
    });
  },{threshold:0.25,rootMargin:'-62px 0px 0px 0px'});
  subSections.forEach(s=>subObs.observe(s));
}

/* =========================================================
   MOBILE NAV TOGGLE
========================================================= */
const mobileBtn  = document.getElementById('mobileBtn');
const mobileMenu = document.getElementById('mobileMenu');
if(mobileBtn && mobileMenu){
  mobileBtn.addEventListener('click',()=>{
    const open = mobileMenu.classList.toggle('open');
    mobileBtn.textContent = open ? '✕' : '☰';
  });
  mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobileMenu.classList.remove('open');
    mobileBtn.textContent='☰';
  }));
}

/* =========================================================
   SCROLL ANIMATIONS
========================================================= */
const animObs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); animObs.unobserve(e.target); }});
},{threshold:0.1});
document.querySelectorAll('[data-anim]').forEach(el=>animObs.observe(el));

/* =========================================================
   TYPEWRITER
========================================================= */
const typeEl = document.getElementById('typewriter');
if(typeEl){
  const phrases=['IT Technician & Developer','Co-Founder @ Easydomotica','Network & Cybersecurity','Game Dev with UE5','Fast learner. Always.'];
  let pi=0,ci=0,del=false;
  function type(){
    const p=phrases[pi];
    typeEl.textContent=del?p.slice(0,ci--):p.slice(0,ci++);
    if(!del&&ci>p.length){del=true;setTimeout(type,1600);return;}
    if(del&&ci<1){del=false;pi=(pi+1)%phrases.length;}
    setTimeout(type,del?38:65);
  }
  type();
}

/* =========================================================
   YEAR
========================================================= */
document.querySelectorAll('.js-year').forEach(el=>el.textContent=new Date().getFullYear());
