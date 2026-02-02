<template>
  <footer class="site-footer">
    <div class="footer-wrap">
      <img :src="footerImg" alt="footer banner" class="footer-banner" />
      <nav class="footer-links" aria-label="Footer links">
        <a href="/terms">Conditions</a>
        <a href="/privacy">Confidentialité</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import footerImg from '../../assets/footer.jpg';
</script>

<style scoped>
.site-footer { padding: 18px 0 40px; }
.footer-wrap { width: 100%; max-width: 1030px; margin: 0 auto; }
.footer-banner { display: block; width: 100%; max-height: 120px; object-fit: cover; border-radius: 6px; }
.footer-links { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding-left: 12px; border-left: 1px solid rgba(230,246,251,0.12); font-size: 12px; color: #e6f6fb; }
.footer-links a { color: inherit; text-decoration: none; opacity: 0.95; }
.footer-links a:hover { text-decoration: underline; color: #FFCF4D; opacity: 1; }
</style>
