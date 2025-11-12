$(document).ready(function () {
    const $form = $('#contact-form');
    const $alert = $('#contact-success');
                                                                                         
    $form.on('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
                                                                                         
        if (this.checkValidity() === false) {
            $(this).addClass('was-validated');
            return;
        }
                                                                                         
        $form.addClass('was-validated');
                                                                                         
        // Simulate async submission
        $(this).find('button[type="submit"]').prop('disabled', true).text('Sending...');
                                                                                         
        setTimeout(function () {
            $alert.removeClass('d-none').hide().fadeIn(300);
            $form[0].reset();
            $form.removeClass('was-validated');
            $form.find('button[type="submit"]').prop('disabled', false).text('Send');
        }, 700);
    });
});
