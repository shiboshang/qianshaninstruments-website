(function(){
  "use strict";

  /* ---------- Language toggle ---------- */
  var root = document.documentElement;
  var langToggle = document.getElementById("langToggle");
  var savedLang = localStorage.getItem("qs-lang");

  function applyLang(lang){
    root.classList.remove("lang-zh","lang-en");
    root.classList.add("lang-" + lang);
    root.setAttribute("lang", lang === "zh" ? "zh" : "en");
    document.querySelectorAll("[data-zh-placeholder]").forEach(function(el){
      el.setAttribute("placeholder", lang === "zh" ? el.dataset.zhPlaceholder : el.dataset.enPlaceholder);
    });
    localStorage.setItem("qs-lang", lang);
  }

  applyLang(savedLang === "en" ? "en" : "zh");

  langToggle.addEventListener("click", function(){
    var current = root.classList.contains("lang-zh") ? "zh" : "en";
    applyLang(current === "zh" ? "en" : "zh");
  });

  /* ---------- Mobile menu ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");
  menuToggle.addEventListener("click", function(){
    mainNav.classList.toggle("is-open");
  });
  mainNav.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", function(){ mainNav.classList.remove("is-open"); });
  });

  /* ---------- Hero carousel (only present on the homepage) ---------- */
  var heroSlidesWrap = document.getElementById("heroSlides");
  var dotsWrap = document.getElementById("heroDots");
  var heroNextBtn = document.getElementById("heroNext");
  var heroPrevBtn = document.getElementById("heroPrev");

  if (heroSlidesWrap && dotsWrap && heroNextBtn && heroPrevBtn){
    var slides = Array.prototype.slice.call(heroSlidesWrap.querySelectorAll(".hero-slide"));
    var current = 0;
    var timer;

    slides.forEach(function(_, i){
      var dot = document.createElement("button");
      dot.className = "dot" + (i === 0 ? " is-active" : "");
      dot.addEventListener("click", function(){ goTo(i); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".dot"));

    function goTo(index){
      slides[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      dots[current].classList.add("is-active");
    }

    function nextSlide(){ goTo(current + 1); }
    function restartTimer(){
      clearInterval(timer);
      timer = setInterval(nextSlide, 5500);
    }

    heroNextBtn.addEventListener("click", function(){ nextSlide(); restartTimer(); });
    heroPrevBtn.addEventListener("click", function(){ goTo(current - 1); restartTimer(); });

    restartTimer();
  }

  /* ---------- Dropdown menus (mega: Solutions/Products, simple: Showcase/News/About) ---------- */
  var headerEl = document.getElementById("header");
  function syncDropdownPosition(){
    var top = headerEl.getBoundingClientRect().bottom;
    document.querySelectorAll(".mega-panel, .simple-panel, .search-panel").forEach(function(panel){
      panel.style.top = top + "px";
    });
  }
  window.addEventListener("scroll", syncDropdownPosition);
  window.addEventListener("resize", syncDropdownPosition);
  syncDropdownPosition();

  var dropdownItems = document.querySelectorAll(".nav-item.has-mega, .nav-item.has-simple");
  dropdownItems.forEach(function(navItem){
    var closeTimer = null;

    function openPanel(){
      clearTimeout(closeTimer);
      syncDropdownPosition();
      dropdownItems.forEach(function(other){ if (other !== navItem) other.classList.remove("is-open"); });
      navItem.classList.add("is-open");
    }
    function scheduleClose(){
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function(){ navItem.classList.remove("is-open"); }, 260);
    }

    navItem.addEventListener("mouseenter", openPanel);
    navItem.addEventListener("mouseleave", scheduleClose);
    navItem.addEventListener("focusin", openPanel);
    navItem.addEventListener("focusout", scheduleClose);

    var cats = navItem.querySelectorAll(".mega-categories li");
    cats.forEach(function(cat){
      cat.addEventListener("mouseenter", function(){
        var key = cat.dataset.cat;
        cats.forEach(function(c){ c.classList.toggle("is-active", c === cat); });
        navItem.querySelectorAll(".mega-sublist").forEach(function(panel){
          panel.classList.toggle("is-shown", panel.dataset.panel === key);
        });
        navItem.querySelectorAll(".mega-preview-item").forEach(function(preview){
          preview.classList.toggle("is-shown", preview.dataset.panel === key);
        });
      });
    });
  });

  document.addEventListener("click", function(e){
    dropdownItems.forEach(function(navItem){
      if (!navItem.contains(e.target)) navItem.classList.remove("is-open");
    });
  });

  /* ---------- Site search ---------- */
  var searchIndex = [
    { zh: "解决方案", en: "Solutions", url: "solutions.html", kw: "解决方案 方案 行业 solutions" },
    { zh: "电力 / 锅炉解决方案", en: "Power & Boiler Solutions", url: "solutions.html#power", kw: "电力 锅炉 主蒸汽 烟气 汽轮机 脱硫 脱硝 power boiler steam turbine" },
    { zh: "冶金 / 钢铁解决方案", en: "Metallurgy & Steel Solutions", url: "solutions.html#metallurgy", kw: "冶金 钢铁 高炉 连铸 轧钢 转炉 metallurgy steel blast furnace" },
    { zh: "石化 / 化工解决方案", en: "Petrochemical & Chemical Solutions", url: "solutions.html#petrochem", kw: "石化 化工 防爆 反应釜 管道 储罐 petrochemical chemical explosion" },
    { zh: "建材 / 水泥窑解决方案", en: "Building Materials & Cement Solutions", url: "solutions.html#cement", kw: "建材 水泥 回转窑 预热器 篦冷机 磨机 cement kiln" },
    { zh: "玻璃 / 陶瓷解决方案", en: "Glass & Ceramics Solutions", url: "solutions.html#glass", kw: "玻璃 陶瓷 熔炉 退火窑 烧成 glass ceramics furnace" },
    { zh: "食品 / 制药解决方案", en: "Food & Pharmaceutical Solutions", url: "solutions.html#food", kw: "食品 制药 卫生级 灭菌釜 洁净车间 food pharmaceutical sanitary" },
    { zh: "产品中心", en: "Products", url: "products.html", kw: "产品 产品中心 products catalog" },
    { zh: "铠装热电偶", en: "Armored Thermocouple", url: "products.html#armored", kw: "铠装热电偶 wrn-630 armored thermocouple" },
    { zh: "装配式热电偶", en: "Assembly Thermocouple", url: "products.html#assembly", kw: "装配式热电偶 wrnk-191 assembly thermocouple" },
    { zh: "热电阻", en: "RTD / PT100", url: "products.html#rtd", kw: "热电阻 pt100 wzp-231 rtd platinum" },
    { zh: "温度变送器", en: "Temperature Transmitter", url: "products.html#transmitter", kw: "温度变送器 变送器 kt hart transmitter" },
    { zh: "高温热电偶", en: "High-Temperature Thermocouple", url: "products.html#hightemp", kw: "高温热电偶 wrek 钨铼 high temperature thermocouple" },
    { zh: "热套管", en: "Thermowell", url: "products.html#thermowell", kw: "热套管 保护管 thermowell" },
    { zh: "工程案例", en: "Showcase", url: "showcase.html", kw: "工程案例 案例 项目 showcase projects" },
    { zh: "服务支持", en: "Service & Support", url: "service.html", kw: "服务支持 服务 support service" },
    { zh: "资料下载", en: "Downloads", url: "service.html#downloads", kw: "资料下载 下载 手册 证书 downloads manual" },
    { zh: "网站地图", en: "Sitemap", url: "service.html#sitemap", kw: "网站地图 sitemap" },
    { zh: "技术博客 / 常见问题", en: "Technical Blog / FAQ", url: "service.html#blog", kw: "技术博客 常见问题 faq blog" },
    { zh: "联系我们", en: "Contact Us", url: "service.html#contact", kw: "联系我们 联系方式 contact 电话 邮箱 地址" },
    { zh: "新闻资讯", en: "News", url: "news.html", kw: "新闻 资讯 news press" },
    { zh: "关于我们", en: "About Us", url: "about.html", kw: "关于我们 公司简介 about company profile" },
    { zh: "资质证书", en: "Certificates", url: "about.html#certificates", kw: "资质证书 证书 iso ce 认证 certificates" },
    { zh: "企业优势", en: "Why QianShan", url: "about.html#advantages", kw: "企业优势 优势 advantages" }
  ];

  var searchToggle = document.getElementById("searchToggle");
  var searchPanel = document.getElementById("searchPanel");
  var searchInput = document.getElementById("searchInput");
  var searchClose = document.getElementById("searchClose");
  var searchResults = document.getElementById("searchResults");

  function findMatches(query){
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(function(item){
      return item.zh.toLowerCase().indexOf(q) !== -1 ||
             item.en.toLowerCase().indexOf(q) !== -1 ||
             item.kw.toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderResults(query){
    searchResults.innerHTML = "";
    var q = query.trim();
    if (!q) return;
    var isZh = root.classList.contains("lang-zh");
    var matches = findMatches(q).slice(0, 8);
    if (matches.length === 0){
      var empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = isZh ? "未找到相关结果，换个关键词试试" : "No matching results — try another keyword";
      searchResults.appendChild(empty);
      return;
    }
    matches.forEach(function(item){
      var a = document.createElement("a");
      a.className = "search-result-item";
      a.href = item.url;
      var h5 = document.createElement("h5");
      h5.textContent = isZh ? item.zh : item.en;
      var p = document.createElement("p");
      p.textContent = item.url;
      a.appendChild(h5);
      a.appendChild(p);
      searchResults.appendChild(a);
    });
  }

  function openSearch(){
    searchPanel.classList.add("is-open");
    syncDropdownPosition();
    setTimeout(function(){ searchInput.focus(); }, 50);
  }
  function closeSearch(){
    searchPanel.classList.remove("is-open");
  }

  searchToggle.addEventListener("click", function(){
    if (searchPanel.classList.contains("is-open")) closeSearch();
    else openSearch();
  });
  searchClose.addEventListener("click", closeSearch);
  document.addEventListener("click", function(e){
    if (searchPanel.classList.contains("is-open") && !searchPanel.contains(e.target) && e.target !== searchToggle && !searchToggle.contains(e.target)){
      closeSearch();
    }
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") closeSearch();
  });
  searchInput.addEventListener("input", function(){ renderResults(searchInput.value); });
  searchInput.addEventListener("keydown", function(e){
    if (e.key === "Enter"){
      var matches = findMatches(searchInput.value);
      if (matches.length > 0) window.location.href = matches[0].url;
    }
  });

  /* ---------- Generic carousels (products / projects / news) ---------- */
  document.querySelectorAll(".carousel-arrow").forEach(function(btn){
    btn.addEventListener("click", function(){
      var track = document.getElementById(btn.dataset.target);
      var amount = track.clientWidth * 0.8;
      track.scrollBy({ left: btn.classList.contains("carousel-arrow--prev") ? -amount : amount, behavior: "smooth" });
    });
  });

  /* ---------- Product tag strip (visual state only) ---------- */
  document.querySelectorAll(".tag").forEach(function(tag){
    tag.addEventListener("click", function(){
      document.querySelectorAll(".tag").forEach(function(t){ t.classList.remove("is-active"); });
      tag.classList.add("is-active");
    });
  });

  /* ---------- Stat counters ---------- */
  var counters = document.querySelectorAll(".counter");
  var counted = false;
  function runCounters(){
    if (counted) return;
    counted = true;
    counters.forEach(function(el){
      var target = parseInt(el.dataset.count, 10);
      var startTime = null;
      var duration = 1200;
      function step(ts){
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        el.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  }
  var statsRow = document.querySelector(".stats-row");
  if (statsRow){
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) runCounters();
      });
    }, { threshold: 0.4 });
    observer.observe(statsRow);
  }

  /* ---------- Back to top ---------- */
  var backToTop = document.getElementById("backToTop");
  window.addEventListener("scroll", function(){
    backToTop.classList.toggle("is-visible", window.scrollY > 500);
  });
  backToTop.addEventListener("click", function(){
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Quote request widget (opened by both the mail icon and the Chat Now button) ---------- */
  var quoteWidget = document.getElementById("quoteWidget");
  var quoteToggle = document.getElementById("quoteToggle");
  var chatToggle = document.getElementById("chatToggle");
  var quoteClose = document.getElementById("quoteClose");
  var quoteForm = document.getElementById("quoteForm");
  var quoteNote = document.getElementById("quoteNote");
  var quoteOpeners = [quoteToggle, chatToggle].filter(Boolean);

  function toggleQuoteWidget(){
    var isOpen = quoteWidget.classList.toggle("is-open");
    quoteOpeners.forEach(function(btn){ btn.classList.toggle("is-active", isOpen); });
  }
  function closeQuoteWidget(){
    quoteWidget.classList.remove("is-open");
    quoteOpeners.forEach(function(btn){ btn.classList.remove("is-active"); });
  }

  quoteOpeners.forEach(function(btn){
    btn.addEventListener("click", toggleQuoteWidget);
  });
  quoteClose.addEventListener("click", closeQuoteWidget);
  document.addEventListener("click", function(e){
    if (quoteWidget.classList.contains("is-open") && !quoteWidget.contains(e.target) && quoteOpeners.indexOf(e.target) === -1 && !quoteOpeners.some(function(btn){ return btn.contains(e.target); })){
      closeQuoteWidget();
    }
  });
  quoteForm.addEventListener("submit", function(e){
    e.preventDefault();
    var isZh = root.classList.contains("lang-zh");
    quoteNote.textContent = isZh
      ? "感谢您的留言！我们会尽快与您联系。"
      : "Thank you for reaching out! We'll get back to you soon.";
    quoteForm.reset();
  });

  /* ---------- Contact form (front-end only, no backend wired up) ---------- */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var isZh = root.classList.contains("lang-zh");
      note.textContent = isZh
        ? "感谢您的留言！我们会尽快与您联系。（表单尚未连接邮件服务，请先配置后端后再上线）"
        : "Thank you for reaching out! We'll get back to you soon. (Form is not yet wired to an email service — connect a backend before going live.)";
      form.reset();
    });
  }

})();
