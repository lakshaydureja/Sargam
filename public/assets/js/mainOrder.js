/*===== MENU SHOW =====*/ 
const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId)

    if(toggle && nav){
        toggle.addEventListener('click', ()=>{
            nav.classList.toggle('show')
        })
    }
}
showMenu('nav-toggle','nav-menu')

/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll('.nav__link')

function linkAction(){
    const navMenu = document.getElementById('nav-menu')
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show')
}
navLink.forEach(n => n.addEventListener('click', linkAction))




function handleButtonClick(event) {
    // Prevent the default button click behavior
    event.preventDefault();

    // Add your logic here (e.g., form validation)

    // Redirect to the new HTML page on the client side
    window.location.href = '/';
}

//form submit
function submitForm() {
    // Get form data
    const formData = new FormData(document.getElementById("paymentForm"));
    
    // Send data to backend using Fetch API
    fetch('/submitPaymentData', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Handle response from the server (e.g., initiate payment)
        console.log(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}