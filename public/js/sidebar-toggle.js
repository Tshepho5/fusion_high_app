/**
 * Sidebar Toggle & Collapse Logic - FUSION_HIGH_APP
 * Optimized for performance and cross-role compatibility (Desktop Collapse & Mobile Drawer)
 */
function initSidebar() {
    const sidebar = document.querySelector('.sidebar, nav.sidebar, aside.sidebar');
    if (!sidebar) {
        return;
    }

    // Ensure overlay exists
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // Collect all toggle buttons and close triggers
    const toggleButtons = document.querySelectorAll(
        '.hamburger, .sidebar-toggle-btn, #parent-sidebar-toggle, #sidebar-toggle-btn, [data-toggle="sidebar"]'
    );
    const closeButtons = document.querySelectorAll(
        '.sidebar-close-btn, #parent-sidebar-close, #sidebar-close-btn, [data-close="sidebar"]'
    );
    const navItems = sidebar.querySelectorAll('.nav-item');

    const isMobile = () => window.innerWidth <= 1024;

    // Update UI state for buttons (accessibility attributes, classes, and tooltips)
    const updateToggleUI = () => {
        const collapsed = sidebar.classList.contains('collapsed');
        const active = sidebar.classList.contains('active');
        const mobile = isMobile();
        const isClosed = mobile ? !active : collapsed;

        toggleButtons.forEach(btn => {
            btn.setAttribute('aria-expanded', String(!isClosed));
            btn.setAttribute('title', isClosed ? 'Open Side Panel (Ctrl+B)' : 'Collapse Side Panel (Ctrl+B)');
            if (isClosed) {
                btn.classList.remove('open');
                btn.classList.add('sidebar-is-closed');
            } else {
                btn.classList.add('open');
                btn.classList.remove('sidebar-is-closed');
            }
        });

        // Trigger chart/layout resize after animation finishes
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 320);
    };

    // Toggle action
    const toggleSidebar = (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (isMobile()) {
            const willBeActive = !sidebar.classList.contains('active');
            sidebar.classList.toggle('active', willBeActive);
            overlay.classList.toggle('active', willBeActive);
            document.body.style.overflow = willBeActive ? 'hidden' : '';
        } else {
            const willBeCollapsed = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed', willBeCollapsed);
            document.body.classList.toggle('sidebar-collapsed', willBeCollapsed);
            try {
                localStorage.setItem('sidebar_collapsed_parent', willBeCollapsed ? 'true' : 'false');
            } catch (_) {}
        }
        updateToggleUI();
    };

    // Explicit close action
    const closeSidebar = (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (isMobile()) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
            try {
                localStorage.setItem('sidebar_collapsed_parent', 'true');
            } catch (_) {}
        }
        updateToggleUI();
    };

    // Explicit open action
    const openSidebar = (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (isMobile()) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('collapsed');
            document.body.classList.remove('sidebar-collapsed');
            try {
                localStorage.setItem('sidebar_collapsed_parent', 'false');
            } catch (_) {}
        }
        updateToggleUI();
    };

    // Attach listeners to all toggle buttons
    toggleButtons.forEach(btn => {
        btn.onclick = toggleSidebar;
    });

    // Attach listeners to all close buttons
    closeButtons.forEach(btn => {
        btn.onclick = closeSidebar;
    });

    // Clicking overlay closes mobile drawer
    overlay.onclick = () => {
        if (isMobile()) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            updateToggleUI();
        }
    };

    // Auto-close drawer on mobile when clicking nav items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (isMobile() && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                updateToggleUI();
            }
        });
    });

    // Keyboard shortcuts: Ctrl+B or Cmd+B to toggle, Escape to close mobile drawer
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            toggleSidebar();
        } else if (e.key === 'Escape') {
            if (isMobile() && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        }
    });

    // Restore saved desktop collapsed state on page load
    if (!isMobile()) {
        try {
            const savedState = localStorage.getItem('sidebar_collapsed_parent');
            if (savedState === 'true') {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
            }
        } catch (_) {}
    }

    updateToggleUI();

    // Export functions globally for programmatic control
    window.toggleSidebar = toggleSidebar;
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    initSidebar();
}