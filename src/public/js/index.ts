const socket = io();
socket.on("connect", function () {
    console.log("Connected to server", $('#queue').val());
    socket.emit("consume", $('#queue').val());
});

socket.on("disconnect", function () {
    console.log("Disconected from server");
    messages = [];
    $('#list').empty();

});

socket.on("acked", function (message) {
    const span = $("span[data-id=" + message.fields.deliveryTag + "]");
    span.parents().eq(1).remove();
    toastr.success("Message acked");
});
socket.on("nacked", function (message) {
    const span = $("span[data-id=" + message.fields.deliveryTag + "]");
    span.parents().eq(1).remove();
    toastr.success("Message nacked");
});

socket.on("m_error", function (message) {
    toastr.error(message.message);
    console.log(message);
});



let messages = [];


socket.on('newMessage', function (data) {
    console.log(data);

    messages.push(data);

    const template = $('#message-template').html();
    const html = Mustache.render(template, {
        data: data.content,
        id: data.fields.deliveryTag
    });
    $('#list').append(html);
    // scrollToBottom();

    // const time = moment(data.createdAt).format('H:mm');
    // console.log("new message", data);
    // const li = $('<li></li>', {text: `${data.from} ${time}: ${data.text}`});
    // $('#list').append(li);
});


$("#list").on('click', "span.ack", function (event) {
    const target = $(event.target);
    const id = target.attr("data-id");
    const message = messages.filter(value => value.fields.deliveryTag == id);
    if (message.length != 1)
        return;
    socket.emit("ack", message.pop());
    // target.parents().eq(1).remove();
});

$("#list").on('click', "span.nack", function (event) {
    const target = $(event.target);
    const id = target.attr("data-id");
    const message = messages.filter(value => value.fields.deliveryTag == id);
    if (message.length != 1)
        return;
    socket.emit("nack", message.pop());
    // target.parents().eq(1).remove();
});
// locationButton.on('click', function () {


//
// socket.on('newLocation', function (data) {
//     const li = $('<li></li>', {text: `${data.from}: `});
//     const a = $('<a target="_blank">My Location</a>');
//     a.attr('href', `https://www.google.com/maps/?q=${data.text.latitude},${data.text.longitude}`);
//     li.append(a);
//     $('#list').append(li);
// });


// `${data.latitude}, ${data.longitude}`

// $("#form").on('submit', function (e) {
//     e.preventDefault();
//
//
//     const messageText = $('[name=message]');
//     socket.emit("createMessage", {
//         text: messageText.val()
//     }, function () {
//         messageText.val('');
//     });
//
//
// });


// const locationButton = $('#location');

// locationButton.on('click', function () {
//     if (!navigator.geolocation) {
//         return alert('Geolocation not suported by your browser');
//     }
//
//     navigator.geolocation.getCurrentPosition(function (position) {
//         console.log(position);
//         socket.emit('createLocation', {
//             latitude: position.coords.latitude,
//             longitude: position.coords.longitude
//         });
//     }, function () {
//         alert('Unable to fetch location');
//     });
//
//
// });
//
//
// function scrollToBottom() {
//     // Selectors
//     const messages = jQuery('#list');
//     const newMessage = messages.children('li:last-child');
//     // Heights
//     const clientHeight = messages.prop('clientHeight');
//     const scrollTop = messages.prop('scrollTop');
//     const scrollHeight = messages.prop('scrollHeight');
//     const newMessageHeight = newMessage.innerHeight();
//     const lastMessageHeight = newMessage.prev().innerHeight();
//
//     if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
//         messages.scrollTop(scrollHeight);
//     }
// }
