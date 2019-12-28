const searchItem = (target) => {
    const itemName = target.childNodes[1].innerText;
    console.log(itemName);
    const search = document.querySelector('.search');
    search.childNodes[0].focus();
    const event = new Event('input', {
        bubbles: true,
        cancelable: true
    });
    search.childNodes[0].value = itemName;
    search.childNodes[0].dispatchEvent(event);

    document.querySelector('.search > .btn').focus();
    document.querySelector('.search > .btn').click();
}