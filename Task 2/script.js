// Script to highlight active section in the navigation
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.side-nav ul li a');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            navLinks.forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
});
