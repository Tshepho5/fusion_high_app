/**
 * Sidebar Toggle Logic - FUSION_HIGH_APP
 * Optimized for performance and cross-role compatibility
 */
function initSidebar() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    
    if (!hamburger || !sidebar) {
        console.warn("Sidebar or Hamburger elements not found in DOM");
        return;
    }

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    };
    
    // Use onclick to prevent multiple listeners being attached on re-init
    hamburger.onclick = toggleSidebar;
    overlay.onclick = toggleSidebar;
}

document.addEventListener('DOMContentLoaded', initSidebar);