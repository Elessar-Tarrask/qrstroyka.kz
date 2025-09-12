const ordersList = document.getElementById("ordersList");
const emptyEl = document.getElementById("empty");


function addOrder(order) {
    if (emptyEl) emptyEl.style.display = "none";

    const orderDiv = document.createElement("div");
    orderDiv.className = "order";
    orderDiv.innerHTML = `
    <span><b>ID заказа:</b> ${order.id}</span>
    <span><b>Email:</b> ${order.email}</span>
    <span><b>Телефон:</b> ${order.phone}</span>
    <span><b>Статус:</b> ${order.status}</span>
  `;
    ordersList.prepend(orderDiv);
}


async function loadOrders() {
    try {
        const response = await fetch("https://cmr.api.stroyka.kz/rest/api/v1/order");

        if (!response.ok) {
            throw new Error("Ошибка загрузки заказов");
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(order => addOrder(order));
        } else {
            emptyEl.innerText = "Нет заказов";
        }
    } catch (err) {
        ordersList.innerHTML = `<p style="color:red">Ошибка: ${err.message}</p>`;
    }
}

loadOrders();
