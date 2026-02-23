$(window).on("load", function () {
  $(".mdl-booking-house").each(function () {
    var $module = $(this);
    var $window = $(window);
    var $stickyContainer = $(".m-sticky-container", $module);
    var $swiperElement = $(".swiper", $module);
    var $slides = $(".swiper-slide", $module);
    var $slotStrip = $(".m-slot-strip", $module);
    var $texts = $(".m-step-text", $module);
    var $nums = $(".m-num", $module);

    var totalItems = Math.min($slides.length, $texts.length);
    if (!totalItems) return;

    var activeIndex = -1;
    var mobileSwiper = null;
    var isDesktop = null;
    var rafPending = false;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, t) {
      return start + (end - start) * t;
    }

    function easeInOutCubic(t) {
      if (t < 0.5) return 4 * t * t * t;
      return 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getNumberHeight() {
      if (!$nums.length) return 0;
      return $nums.first().outerHeight() || 0;
    }

    function setDiscreteTextState(index) {
      var clampedIndex = clamp(index, 0, totalItems - 1);
      if (clampedIndex === activeIndex) return;

      activeIndex = clampedIndex;
      $texts.removeClass("v-active v-prev v-next");
      $texts.each(function (itemIndex) {
        if (itemIndex === clampedIndex) {
          $(this).addClass("v-active");
        } else if (itemIndex < clampedIndex) {
          $(this).addClass("v-prev");
        } else {
          $(this).addClass("v-next");
        }
      });
    }

    function updateSlotMachine(rawIndex) {
      var numHeight = getNumberHeight();
      if (!numHeight) return;

      var baseIndex = Math.floor(rawIndex);
      var segmentProgress = rawIndex - baseIndex;
      var easedProgress = easeInOutCubic(segmentProgress);
      var slotIndex = clamp(baseIndex + easedProgress, 0, totalItems - 1);
      var slotY = -(slotIndex * numHeight);

      $slotStrip.css("transform", "translateY(" + slotY.toFixed(3) + "px)");
    }

    function updateSlides(rawIndex) {
      $slides.each(function (itemIndex) {
        var $slide = $(this);

        if (itemIndex >= totalItems) {
          $slide.css({
            opacity: "0",
            zIndex: 1,
            transform: "translate(-50%, -50%) translate3d(130%, 24px, 0) rotate(15deg) scale(0.85)",
          });
          return;
        }

        var delta = itemIndex - rawIndex;
        var absDelta = Math.abs(delta);
        var localProgress = clamp(absDelta, 0, 1);

        var x = delta >= 0 ? lerp(0, 100, localProgress) : lerp(0, -100, localProgress);
        var rotate = delta >= 0 ? lerp(0, 15, localProgress) : lerp(0, -15, localProgress);
        var scale = lerp(1, 0.85, localProgress);
        var opacity = delta >= 0 ? lerp(1, 0.5, localProgress) : lerp(1, 0, localProgress);
        var arcY = lerp(0, 24, localProgress);

        if (delta > 1) {
          x = 130;
          rotate = 15;
          scale = 0.85;
          opacity = 0;
          arcY = 24;
        } else if (delta < -1) {
          x = -130;
          rotate = -15;
          scale = 0.85;
          opacity = 0;
          arcY = 24;
        }

        var zIndex = absDelta > 1 ? 1 : Math.max(5, 10 - Math.round(localProgress * 5));

        $slide.css({
          opacity: opacity.toFixed(4),
          zIndex: zIndex,
          transform:
            "translate(-50%, -50%) translate3d(" +
            x.toFixed(3) +
            "%, " +
            arcY.toFixed(3) +
            "px, 0) rotate(" +
            rotate.toFixed(3) +
            "deg) scale(" +
            scale.toFixed(4) +
            ")",
        });
      });
    }

    function updateTexts(rawIndex) {
      var delayedIndex = rawIndex;

      $texts.each(function (itemIndex) {
        var $text = $(this);

        if (itemIndex >= totalItems) {
          $text.css({
            opacity: "0",
            transform: "translateY(20px)",
          });
          return;
        }

        var delta = delayedIndex - itemIndex;
        var opacity = 0;
        var y = delta < 0 ? 20 : -20;
        var range = 0.5;

        if (delta >= -range && delta <= 0) {
          var enterProgress = (delta + range) / range;
          opacity = enterProgress;
          y = lerp(20, 0, enterProgress);
        } else if (delta > 0 && delta <= range) {
          var exitProgress = delta / range;
          opacity = 1 - exitProgress;
          y = lerp(0, -20, exitProgress);
        }

        $text.css({
          opacity: opacity.toFixed(4),
          transform: "translateY(" + y.toFixed(3) + "px)",
        });
      });
    }

    function clearDesktopInlineStyles() {
      $slides.each(function () {
        this.style.opacity = "";
        this.style.zIndex = "";
        this.style.transform = "";
      });

      $texts.each(function () {
        this.style.opacity = "";
        this.style.transform = "";
      });

      if ($slotStrip.length) {
        $slotStrip[0].style.transform = "";
      }
    }

    function updateMobileState(index) {
      var safeIndex = clamp(index || 0, 0, totalItems - 1);
      setDiscreteTextState(safeIndex);

      var numHeight = getNumberHeight();
      if (numHeight) {
        var slotY = -(safeIndex * numHeight);
        $slotStrip.css("transform", "translateY(" + slotY + "px)");
      }
    }

    function initMobileSwiper() {
      if (mobileSwiper || !$swiperElement.length || typeof Swiper === "undefined") {
        updateMobileState(0);
        return;
      }

      mobileSwiper = new Swiper($swiperElement[0], {
        slidesPerView: "auto",
        centeredSlides: true,
        spaceBetween: 24,
        speed: 400,
        grabCursor: true,
        on: {
          init: function (swiperInstance) {
            updateMobileState(swiperInstance.activeIndex);
          },
          slideChange: function (swiperInstance) {
            updateMobileState(swiperInstance.activeIndex);
          },
        },
      });
    }

    function destroyMobileSwiper() {
      if (!mobileSwiper) return;
      mobileSwiper.destroy(true, true);
      mobileSwiper = null;
    }

    function applyDesktopState() {
      if (!isDesktop) return;

      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var trackTop = $stickyContainer.offset().top;
      var trackDistance = Math.max($stickyContainer.outerHeight() - viewportHeight, 1);
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      var progress = clamp((scrollTop - trackTop) / trackDistance, 0, 1);
      var pinStart = trackTop;
      var pinEnd = trackTop + trackDistance;
      var isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      $module.toggleClass("v-scroll-pinned", isPinned);

      // Timeline split evenly between all items.
      var rawIndex = progress * (totalItems - 1);

      updateSlides(rawIndex);
      updateSlotMachine(rawIndex);
      updateTexts(rawIndex);
      setDiscreteTextState(Math.round(rawIndex));
    }

    function requestDesktopRender() {
      if (!isDesktop || rafPending) return;

      rafPending = true;
      window.requestAnimationFrame(function () {
        rafPending = false;
        applyDesktopState();
      });
    }

    function syncMode() {
      var nextDesktop = window.matchMedia("(min-width: 1194px)").matches;
      if (nextDesktop === isDesktop) return;

      isDesktop = nextDesktop;
      $module.toggleClass("v-desktop-scrollytelling", isDesktop);

      if (isDesktop) {
        destroyMobileSwiper();
        clearDesktopInlineStyles();
        $stickyContainer.css("--booking-steps", totalItems);
        requestDesktopRender();
      } else {
        clearDesktopInlineStyles();
        $module.removeClass("v-scroll-pinned");
        $stickyContainer.css("--booking-steps", "");
        initMobileSwiper();
      }
    }

    // Pills Interaction
    $(".m-pill", $module).on("click", function () {
      $(this).addClass("v-active").siblings().removeClass("v-active");
    });

    $window.on("scroll", function () {
      requestDesktopRender();
    });

    $window.on("resize", function () {
      syncMode();
      requestDesktopRender();
    });

    syncMode();
    requestDesktopRender();
  });
});
