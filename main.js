  
      document.getElementById('cedula').addEventListener('keyup', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        put_persona(this.id,this.value);
      });
      document.getElementById('ref').addEventListener('paste', function(e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pasted.replace(/\D/g, '').slice(-6);
        this.value = digits;
        put_pago(this.id, digits);
        validateMin(this, 6, 'referencia');
      });
      const modalTerms = new bootstrap.Modal(document.getElementById('termsModal'), {
        keyboard: false
      });
      modalTerms.show();

      jQuery(document).ready(function() {
        jQuery('.select2').select2();

        // Configuración especial para el selector de código de país
        jQuery('#codigo_pais').select2({
          width: '140px',
          matcher: function(params, data) {
            if (jQuery.trim(params.term) === '') {
              return data;
            }
            var searchTerm = params.term.toLowerCase();
            var text = data.text.toLowerCase();
            var country = jQuery(data.element).data('country');
            if (country) {
              country = country.toLowerCase();
            }
            if (text.indexOf(searchTerm) > -1 || (country && country.indexOf(searchTerm) > -1)) {
              return data;
            }
            return null;
          }
        });
      });

      let cant_boletos = document.getElementById("cant_boletos");
      let c_persona = document.getElementById("c_persona");
      const digitos = 6;
      let paso = 1;
      let quedan = 1000000 - 671799;
      let PaymentSelected = 11;
      let cantidad_minima = 2;
      let cantidad_minima_usd = 20;
      let compra_minima = cantidad_minima;
      let seleccionado = 2;
      let TasaSelected = {}
      TasaSelected.tipo = 1;
      let moneda = "BS";

      // Variables para selección manual de tickets
      const tipoRifa = 'automatico';
      let selectionMode = tipoRifa === 'manual' ? 'manual' : 'automatico';
      let selectedTickets = [];
      let currentTicketPage = 0;
      let totalTicketPages = 1000;
      let ticketsCache = {};

      // Función para cambiar el modo de selección
      function setSelectionMode(mode) {
        selectionMode = mode;

        // Actualizar botones
        document.getElementById('btn-modo-auto')?.classList.toggle('active', mode === 'automatico');
        document.getElementById('btn-modo-manual')?.classList.toggle('active', mode === 'manual');

        // Mostrar/ocultar secciones
        const autoSection = document.getElementById('automatic-selection');
        const manualSection = document.getElementById('manual-selection');

        if (mode === 'manual') {
          autoSection?.classList.add('hidden');
          manualSection?.classList.add('visible');
          // Cargar tickets si es la primera vez
          if (!ticketsCache[currentTicketPage]) {
            loadTicketsPage(0);
          }
        } else {
          autoSection?.classList.remove('hidden');
          manualSection?.classList.remove('visible');
        }

        calcular_total();
      }

      // Función para cargar una página de tickets
      async function loadTicketsPage(page) {
        if (page < 0 || page >= totalTicketPages) return;

        currentTicketPage = page;
        const grid = document.getElementById('tickets-grid');
        grid.innerHTML = '<div class="tickets-loading">Cargando tickets...</div>';

        try {
          const response = await fetch(`https://loslingui.com/api/raffle/246/tickets-disponibles?page=${page}`);
          const data = await response.json();

          if (data.success) {
            ticketsCache[page] = data.tickets;
            totalTicketPages = data.total_pages;
            renderTickets(data.tickets);
            updatePagination();
          } else {
            grid.innerHTML = '<div class="tickets-loading">Error al cargar tickets</div>';
          }
        } catch (error) {
          console.error('Error loading tickets:', error);
          grid.innerHTML = '<div class="tickets-loading">Error de conexión</div>';
        }
      }

      // Función para renderizar los tickets en el grid
      function renderTickets(tickets) {
        const grid = document.getElementById('tickets-grid');
        grid.innerHTML = '';

        tickets.forEach(ticket => {
          const div = document.createElement('div');
          div.className = 'ticket-item';
          div.textContent = ticket.formateado;
          div.dataset.numero = ticket.numero;

          if (!ticket.disponible) {
            div.classList.add('sold');
          } else {
            div.classList.add('available');
            if (selectedTickets.includes(ticket.numero)) {
              div.classList.add('selected');
            }
            div.onclick = () => toggleTicket(ticket.numero, ticket.formateado);
          }

          grid.appendChild(div);
        });
      }

      // Función para seleccionar/deseleccionar un ticket
      function toggleTicket(numero, formateado) {
        const index = selectedTickets.indexOf(numero);

        if (index === -1) {
          // Agregar ticket
          selectedTickets.push(numero);
        } else {
          // Quitar ticket
          selectedTickets.splice(index, 1);
        }

        // Actualizar UI del ticket
        const ticketEl = document.querySelector(`.ticket-item[data-numero="${numero}"]`);
        if (ticketEl) {
          ticketEl.classList.toggle('selected', index === -1);
        }

        updateSelectedTicketsSummary();
        calcular_total();
      }

      // Función para actualizar el resumen de tickets seleccionados
      function updateSelectedTicketsSummary() {
        const countEl = document.getElementById('selected-count');
        const listEl = document.getElementById('selected-tickets-list');

        countEl.textContent = selectedTickets.length;

        if (selectedTickets.length === 0) {
          listEl.innerHTML = '<span style="color: #888; font-size: 12px;">Ningún ticket seleccionado</span>';
        } else {
          listEl.innerHTML = selectedTickets.map(numero => {
            const formateado = numero.toString().padStart(digitos, '0');
            return `<span class="selected-ticket-tag">${formateado} <span class="remove" onclick="removeTicket(${numero})">&times;</span></span>`;
          }).join('');
        }
      }

      // Función para remover un ticket de la selección
      function removeTicket(numero) {
        const index = selectedTickets.indexOf(numero);
        if (index !== -1) {
          selectedTickets.splice(index, 1);

          // Actualizar UI del ticket si está visible
          const ticketEl = document.querySelector(`.ticket-item[data-numero="${numero}"]`);
          if (ticketEl) {
            ticketEl.classList.remove('selected');
          }

          updateSelectedTicketsSummary();
          calcular_total();
        }
      }

      // Función para limpiar todos los tickets seleccionados
      function clearSelectedTickets() {
        selectedTickets = [];
        document.querySelectorAll('.ticket-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        updateSelectedTicketsSummary();
        calcular_total();
      }

      // Función para actualizar la paginación
      function updatePagination() {
        const prevBtn = document.getElementById('btn-prev-page');
        const nextBtn = document.getElementById('btn-next-page');
        const pageInfo = document.getElementById('page-info');

        prevBtn.disabled = currentTicketPage === 0;
        nextBtn.disabled = currentTicketPage >= totalTicketPages - 1;

        const startNum = currentTicketPage * 1000;
        const endNum = Math.min(startNum + 999, 999999);
        pageInfo.textContent = `${startNum.toString().padStart(digitos, '0')} - ${endNum.toString().padStart(digitos, '0')}`;
      }

      // Inicializar si es modo manual
      if (tipoRifa === 'manual') {
        loadTicketsPage(0);
      }

      function showPaymentData(_this, payment) {
        const {id, metodo, titulo, texto_copiar, descripcion, currency_codigo, currency_simbolo, currency_nombre, currency_tasa, compra_minima: metodoCompraMinima} = payment;

        PaymentSelected = id;
        $("#banco_emisor").select2();

        $("#ref_banco_text").html("Referencia Bancaria");
        $("#ref").attr("placeholder","Últimos 6 dígitos");

        if(currency_codigo == 'VES'){
          ref.setAttribute("maxlength","6");
        } else {
          $("#ref_banco_text").html("Titular de la cuenta");
          $("#ref").attr("placeholder","Titular de la cuenta");
          ref.removeAttribute('maxlength');
        }

        $(".img_payment").each(function(index){
          $(this).removeClass("selected");
        })

        $(_this).find("img.img_payment").addClass("selected");

        // Actualizar título del método de pago
        $("#payment_title").html(titulo || metodo);

        // Actualizar texto para copiar
        $("#payment_text_copy").html(texto_copiar || descripcion);

        // Actualizar descripción adicional
        $("#payment_description").html(descripcion || '');

        TasaSelected = {
          codigo: currency_codigo,
          simbolo: currency_simbolo,
          nombre: currency_nombre,
          tasa: parseFloat(currency_tasa) || 1
        };

        // Usar compra_minima del metodo de pago
        compra_minima = parseInt(metodoCompraMinima) || 1;
        // Actualizar el texto de cantidad mínima
        $("#cantidad_minima_valor").html(compra_minima);
        showNewTasa();
      }

      function showNewTasa() {
        if(TasaSelected) {
          moneda = TasaSelected.codigo == 'VES' ? "Bs" : TasaSelected.simbolo;
          $("#moneda_chip").html("(" + TasaSelected.nombre + ")");
          putCompraMinima();
        }
      }

      function putCompraMinima() {
        // Obtener la cantidad actual seleccionada
        const currentCant = parseInt(cant_boletos.value) || compra_minima;
        // Si la cantidad actual es mayor que la compra mínima, mantenerla
        // Si es menor, usar la compra mínima del método de pago
        const newCant = Math.max(currentCant, compra_minima);

        $("#tickets_comprar").html(compra_minima);
        datos.cant_boletos = newCant;
        put_cant(newCant);
        calcular_total();
      }

      function copiarTexto(){
        const textElement = document.getElementById('payment_text_copy');
        const text = textElement.innerText.replace(/<\/?[^>]+(>|$)/g, "").trim();
        navigator.clipboard.writeText(text)
        .then(() => {
          // Mostrar feedback visual
          const copyBtn = textElement.nextElementSibling;
          const originalIcon = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check" style="color: #4ade80; font-size: 18px;"></i>';
          setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
          }, 2000);
        })
        .catch(err => console.error("Error:", err));
      }

      // Promociones por cantidad (ordenadas por min_quantity ascendente)
      const promotions = [
              ];

      const datos = {
        cant_boletos: 2,
        precio_base: 1.00, // Precio base en USD
        persona: {
          nombre_completo: "",
          cedula: "",
          whatsapp: "",
          c_persona: ""
        },
        pago: {
          archivo_pago: "",
          ref: "",
          // fecha: ""
        }
      }

      /**
       * Obtiene el precio por ticket basado en la cantidad y las promociones
       */
      function getPriceForQuantity(quantity) {
        let pricePerTicket = datos.precio_base;
        let appliedPromo = null;

        // Buscar la mejor promoción aplicable (la de mayor min_quantity que sea <= cantidad)
        for (let i = promotions.length - 1; i >= 0; i--) {
          if (quantity >= promotions[i].min_quantity) {
            pricePerTicket = promotions[i].price_per_ticket;
            appliedPromo = promotions[i];
            break;
          }
        }

        return { pricePerTicket, appliedPromo };
      }

      /**
       * Actualiza la visualización de la promoción aplicada
       */
      function updatePromoDisplay(quantity) {
        const { pricePerTicket, appliedPromo } = getPriceForQuantity(quantity);
        const promoMessage = document.getElementById('promo-message');
        const promoMessageText = document.getElementById('promo-message-text');
        const promoCards = document.querySelectorAll('.promo-card');

        // Resetear todos los cards
        promoCards.forEach(card => {
          card.style.borderColor = 'rgba(255,255,255,0.2)';
          card.style.transform = 'scale(1)';
        });

        if (appliedPromo && promoMessage) {
          const savings = ((1 - (pricePerTicket / datos.precio_base)) * 100).toFixed(0);
          promoMessageText.textContent = `Ahorrando ${savings}% - $${pricePerTicket.toFixed(2)}/ticket`;
          promoMessage.style.display = 'block';

          // Resaltar el card de la promoción aplicada
          promoCards.forEach(card => {
            if (parseInt(card.dataset.min) === appliedPromo.min_quantity) {
              card.style.borderColor = '#4ade80';
              card.style.transform = 'scale(1.05)';
            }
          });
        } else if (promoMessage) {
          promoMessage.style.display = 'none';
        }
      }

      // Inicializar TasaSelected con el primer método de pago
            TasaSelected = {
        codigo: 'VES',
        simbolo: 'Bs.',
        nombre: 'Bolívares',
        tasa: 630.000000
      };
      // Usar compra_minima del primer metodo de pago
      compra_minima = 2;
      moneda = TasaSelected.codigo == 'VES' ? "Bs" : TasaSelected.simbolo;
      $("#moneda").html(TasaSelected.nombre);
      // Seleccionar visualmente el primer metodo
      $("#metodo_11 img.img_payment").addClass("selected");
      
      // Inicializar con la compra minima del metodo seleccionado
      put_cant(compra_minima);
      calcular_total();

      function volver_comprar(){
        cant_boletos.value = compra_minima;
        document.getElementById("ref").value = "";
        // document.getElementById("fecha").value = "";
        document.getElementById("archivo_pago").value = "";
        datos.cant_boletos = compra_minima;
        datos.pago.archivo_pago = "";
        datos.pago.ref = "";
        // datos.pago.fecha = "";
        jQuery("#paso_final").addClass("hidden");
        jQuery("#paso1").removeClass("hidden");
        paso = 1;
      }

      function minus_cant(){
        if(cant_boletos.value > compra_minima){
          cant_boletos.value--; 
          datos.cant_boletos = parseInt(cant_boletos.value);
          calcular_total();
        }
        
      }

      function validateMin(_this,length,campo) {
        const isValid = _this.value.length >= length;

        if(campo == "cédula"){
          if(["25697137",'506607131'].includes(_this.value)){
              Swal.fire(`Por favor introduzca su cédula correctamente`);
              datos.pago.ref = "";
              _this.value = "";
              return;
          }
        }

        if(campo == "referencia"){
          if(["25697137","607131"].includes(_this.value)){
              Swal.fire(`Por favor introduzca la referencia correctamente`);
              datos.pago.ref = "";
              _this.value = "";
              return;
          }
          // Validar mínimo 6 dígitos solo para pagos en Bolívares (VES)
          if(TasaSelected.codigo === 'VES' && !isValid) {
              Swal.fire(`La referencia debe ser de ${length} dígitos`);
              datos.pago.ref = "";
              _this.value = "";
              return;
          }
        }

        if(campo != "referencia" && !isValid) {
          Swal.fire(`La ${campo} debe ser al menos de ${length} dígitos`);
          datos.pago.ref = "";
          _this.value = "";
        }
      }

      function sum_cant(){

        if(cant_boletos.value > 199 && digitos == 4){
          Swal.fire("la compra máxima es de 200 boletos");
          return;
        }

        if(cant_boletos.value > quedan){
          Swal.fire("no hay boletos suficientes");
          return;
        }
        cant_boletos.value++; 
        datos.cant_boletos = parseInt(cant_boletos.value);
        calcular_total();
      }

     function put_cant(cant){
      if(cant > quedan){
        alert("no hay boletos suficientes");
        return;
      }

      if(cant < compra_minima){
        return;
      }

      cant_boletos.value = cant;
      datos.cant_boletos = cant;
      calcular_total();
    }

      function put_persona(object,value){
        datos.persona[object] = value.trim();
      }

      function put_pago(object,value){
        datos.pago[object] = value.trim();
      }

      function validar_cant(value){
        valueInt = parseInt(value);

        if(valueInt < compra_minima || value == "" || value == null || value == "undefined"){
          Swal.fire(`La compra mínima es de ${compra_minima} boletos`);
          cant_boletos.value = compra_minima;
          put_cant(compra_minima);
          return;
        }

        if(valueInt > 200 && digitos == 4){
          Swal.fire("La compra máxima es de 200 boletos");
          cant_boletos.value = compra_minima;
          put_cant(compra_minima);
          return;
        }

        if(valueInt > quedan){
          Swal.fire("no hay boletos suficientes");
          cant_boletos.value = compra_minima;
          put_cant(compra_minima);
          return;
        }
        seleccionado = value;
        put_cant(value);
      }

      function calcular_total() {
        // Calcular precio en la moneda seleccionada
        const tasa = TasaSelected.tasa || 1;
        // En modo manual, usar la cantidad de tickets seleccionados
        const cantidad = selectionMode === 'manual' ? selectedTickets.length : datos.cant_boletos;

        // Obtener el precio por ticket (con promoción si aplica)
        const { pricePerTicket } = getPriceForQuantity(cantidad);

        const total = pricePerTicket * cantidad * tasa;
        const simbolo = TasaSelected.simbolo || '$';

        jQuery("#final_bs").html(`${simbolo} ${total.toFixed(2)}`);

        // Actualizar visualización de promociones
        updatePromoDisplay(cantidad);
      }

      function validar_datos() {
        const cedula = jQuery("#cedula").val();
        if(cedula.length < 6) {
          Swal.fire("La cédula debe tener mínimo 6 dígitos");
          return false;
        }

        const arr = {
          "nombre_completo": jQuery("#nombre_completo").val(),
          "cedula": cedula,
          "whatsapp": jQuery("#numero_telefono").val(),
          "c_persona": jQuery("#c_persona").val(),
          "ref": jQuery("#ref").val(),
          "banco_emisor": jQuery("#banco_emisor").val(),
        };

        for (const val of Object.values(arr)) {
          if(val == "undefined" || val == "" || val == null) {
            Swal.fire("Todos los campos son obligatorios");
            return false;
          }
        }

        return true;
      }

      function atras() {
        window.location.href = "https://loslingui.com";
      }

      function paso_atras(){
        show_hide("atras");
        paso--;
      }

      function paso_adelante() {
        show_hide("adelante");
        paso++;
      }

      function show_hide(tipo){
          if(paso == 1 && tipo=="adelante"){
            jQuery("#paso1").addClass("hidden");
            jQuery("#paso_final").removeClass("hidden");
          }
          
          if(paso == 2 && tipo=="adelante"){
            jQuery("#paso2").addClass("hidden");
            jQuery("#paso_final").removeClass("hidden");
          }
          
          if(paso == 2 && tipo=="atras"){
            jQuery("#paso2").addClass("hidden");
            jQuery("#paso1").removeClass("hidden");
          }
          jQuery("#boton_comprar").addClass("hidden");
      }

      function validatec_persona(c_personaField) {
        let _email = c_personaField.trim().toLowerCase();
        const regex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

        if(!regex.test(_email) ){
          Swal.fire("El correo electrónico está mal escrito, por favor corregir");
          c_persona.value = "";
          return;
        }

        const corrections = {
          'gmail.comm':'gmail.com',
          'gmail.cpm':'gmail.com',
          'gmil.com':'gmail.com',
          'gmil.con':'gmail.com',
          'gimeil.com':'gmail.com',
          'gimeil.con':'gmail.com',
          'gmeil.con':'gmail.com',
          'gmail.clm':'gmail.com',
          'gmeil.com':'gmail.com',
          'gmail.como':'gmail.com',
          'gmail.comb':'gmail.com',
          'gmal.com':'gmail.com',
          'gamail.com':'gmail.com',
          'gnail.com':'gmail.com',
          'gimail.com':'gmail.com',
          'gmail.comom':'gmail.com',
          'gmail.vom':'gmail.com',
          'mail.com':'gmail.com',
          'gmail.con':'gmail.com',
          'gamil.com':'gmail.com',
          'gmai.com':'gmail.com',
          'mqil.com':'gmail.com',
          'hormail.com':'hotmail.com',
          'hotamil.com':'hotmail.com',
          'homail.com':'hotmail.com',
          'hoymail.com':'hotmail.com',
          'hmail.com':'hotmail.com',
          'hotmai.com':'hotmail.com',
          'hotmail.con':'hotmail.com',
          'icloid.con':'icloud.com',
        };

        const parts = _email.split('@');
        if (parts.length === 2) {
            const domain = parts[1].toLowerCase();
            if (corrections[domain]) {
              _email = `${parts[0]}@${corrections[domain]}`;
            }
        }

        datos.persona.c_persona  = _email ;
        c_persona.value = _email;
      }

      function finalizar_compra(_this) {

        const archivo_pago = document.querySelector("#archivo_pago");

        // Validación según el modo de selección
        if (selectionMode === 'manual') {
          if (selectedTickets.length < 1) {
            Swal.fire("Debes seleccionar al menos un ticket");
            return;
          }
          if (selectedTickets.length < compra_minima) {
            Swal.fire(`La compra mínima es de ${compra_minima} tickets`);
            return;
          }
        } else {
          if(datos.cant_boletos < 1){
            Swal.fire("Por favor verifique la cantidad seleccionada");
            return;
          }
        }

        if(jQuery("#ref").val() == "") {
          Swal.fire("Debes colocar la referencia");
          return;
        }

        // if(jQuery("#fecha").val() == "") {
        //   Swal.fire("Debes colocar la fecha del pago");
        //   return;
        // }

        if(archivo_pago.files.length != 1) {
          Swal.fire("Debes subir el capture bancario");
          return;
        }

        if(jQuery("#banco_emisor").val() == "") {
          Swal.fire("Debes seleccionar el banco emisor");
          return;
        }

        if(!validar_datos()) {
          return;
        }

        const formData = new FormData();
        formData.append("raffle_uuid", '657cb4f5-e1f5-11f0-8b5f-d404e68351ca');
        formData.append("nombre_completo", jQuery("#nombre_completo").val());
        formData.append("correo", jQuery("#c_persona").val());
        formData.append("tlf", jQuery("#codigo_pais").val() + jQuery("#numero_telefono").val());

        // Enviar cantidad y modo de selección
        formData.append("tipo_seleccion", selectionMode);
        if (selectionMode === 'manual') {
          formData.append("cantidad", selectedTickets.length);
          formData.append("tickets_seleccionados", JSON.stringify(selectedTickets));
        } else {
          formData.append("cantidad", datos.cant_boletos);
        }

        formData.append("cedula", jQuery("#cedula").val());
        formData.append("ref_banco", jQuery("#ref").val());
        formData.append("metodo_pago", PaymentSelected);
        formData.append("ref_imagen", archivo_pago.files[0]);
        formData.append("banco_emisor",jQuery("#banco_emisor").val());

        // formData.append("ref_fecha", jQuery("#fecha").val());

        const linkGuardar = "https://loslingui.com/api/orderCliente";
        let UUID_COMPRA;

        _this.disabled = true;
        _this.innerHTML = "Realizando Compra....";

        fetch(linkGuardar,{
          method: "POST",
          cache: "no-cache",
          body: formData
        })
        .then(response => {
            // **CORRECCIÓN 1: Manejo de errores de estado HTTP (4xx, 5xx)**
            if (response.status === 422) {
                return response.json().then(data => {
                    // 'data.errors' contendrá los errores de validación (Causa 1)
                    // 'data.message' contendrá los errores de lógica de negocio (Causa 2)
                    console.error('Error de Validación (422):', data);
                    // Aquí debe mostrar los errores al usuario (ej. debajo de cada campo)
                    alert(data.message || 'Error de validación. Revise los campos.');
                    // Swal.fire({
                    //   icon: "error",
                    //   title: "Error",
                    //   text: data.message,
                    // });
                    throw new Error(data.message);
                });
            }
            if (!response.ok) {
                // Si la respuesta no es OK, lanzamos un error para que sea capturado por el .catch()
                // Swal.fire(`Error de red o servidor: ${response.status} ${response.statusText}`);
                throw new Error(`Error de red o servidor: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then( res => {
          console.log(res)
          if(res.success == true){
            UUID_COMPRA = res.compra.uuid;
            let timerInterval;
            Swal.fire({
              title: "Realizando Compra...",
              timer: 1500,
              timerProgressBar: true,
              didOpen: () => {
                Swal.showLoading();
              }
            }).then((result) => {
              if (result.dismiss === Swal.DismissReason.timer) {
                show_hide("adelante");
                showTickets(UUID_COMPRA);
              }
            });
          }else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: res.message,
            });

            _this.disabled = false;
            _this.innerHTML = "Comprar";
          }
        })
        .catch(error => {
            // **CORRECCIÓN 2: Bloque .catch() para errores de red o promesa**
            console.error("Error en la solicitud de compra:", error);
            // Swal.fire({
            //   icon: "error",
            //   title: "Error de Conexión",
            //   text: "No se pudo completar la compra. Por favor, revise su conexión a internet o intente de nuevo. Detalles: " + error.message,
            // });

            // Restablecer el botón
            _this.disabled = false;
            _this.innerHTML = "Comprar";
        });
      }

      function showTickets(uuid) {
        let timeLeft = 10;
        const checkInterval = 18000;
        let verificationInterval;

        Swal.fire({
          title: 'Generando Tickets...',
          html: `Por favor espere <b>${timeLeft}</b> segundos.`,
          timer: timeLeft * 1000,
          timerProgressBar: true,
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            const timer = Swal.getHtmlContainer().querySelector('b');
            const timerInterval = setInterval(() => {
              timeLeft--;
              timer.textContent = timeLeft;
            }, 1000);
          },
        }).then((result) => {
          window.location.href = `https://loslingui.com/orden/${uuid}`;
        });
      }

      function startPaymentVerification(uuid) {
        let timeLeft = 90;
        const checkInterval = 18000;
        let verificationInterval;

        Swal.fire({
          title: 'Validando su pago...',
          html: `Por favor espere <b>${timeLeft}</b> segundos.`,
          timer: timeLeft * 1000,
          timerProgressBar: true,
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            const timer = Swal.getHtmlContainer().querySelector('b');
            const timerInterval = setInterval(() => {
              timeLeft--;
              timer.textContent = timeLeft;
            }, 1000);
            
            const checkPaymentStatus = () => {
              fetch(`https://loslingui.com/api/order/checkOrder/${uuid}`)
                .then(response => response.json())
                .then(res => {
                  console.log("res::> ",res);
                  console.log("res.data::> ",res.data);
                  if (res.data.status == 1) {
                    clearInterval(verificationInterval);
                    Swal.close();
                    window.location.href = `https://loslingui.com/orden/${uuid}`;
                  }
                });
            };

            checkPaymentStatus();
            verificationInterval = setInterval(checkPaymentStatus, checkInterval);
            
            Swal.getTimerLeft().then(() => {
              clearInterval(timerInterval);
            });
          },
          willClose: () => {
            clearInterval(verificationInterval);
          }
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.timer) {
            Swal.fire({
              icon: "info",
              title: "loslingui",
              text: "Su compra no se pudo procesar de manera automática, por favor espere la verificación manual, recibirá un correo.",
            });
          }
        });
      }

      const fileInput = document.getElementById('archivo_pago');
      const imagePreview = document.getElementById('preview_capture');

      // fileInput.addEventListener('change', async function () {
      //   const file = fileInput.files[0];
        
      //   if (file && file.type.startsWith('image/')) {
      //     try {
      //       const resizedImage = await resizeImage(file);
            
      //       fileInput.files = createFileList(resizedImage);
      //     } catch (error) {
      //       console.error('Error al procesar la imagen:', error);
      //     }
      //   }
      // });

      /**
       * Redimensiona y comprime la imagen a 1024x768.
       * @param {File} file - Archivo de imagen original
       * @returns {Promise<File>} - Imagen comprimida y redimensionada
       */
      function resizeImage(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);

          reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;

            img.onload = function () {
              // Crear un canvas con tamaño fijo 1024x768
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const targetWidth = 768;
              const targetHeight = 1024;
              
              canvas.width = targetWidth;
              canvas.height = targetHeight;

              // Dibujar la imagen en el canvas con el tamaño deseado
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

              // Convertir el canvas a Blob con calidad reducida (ajusta la calidad si es necesario)
              canvas.toBlob(
                function (blob) {
                  if (blob) {
                    // Convertir el Blob en un archivo y resolver la promesa
                    const resizedFile = new File([blob], file.name, {
                      type: file.type,
                      lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                  } else {
                    reject(new Error('Error al crear el Blob de la imagen.'));
                  }
                },
                'image/jpeg', // Formato de salida
                0.5 // Calidad de la imagen (entre 0 y 1, donde 1 es la máxima calidad)
              );
            };

            img.onerror = function () {
              reject(new Error('Error al cargar la imagen.'));
            };
          };

          reader.onerror = function () {
            reject(new Error('Error al leer el archivo.'));
          };
        });
      }

      /**
       * Previsualiza la imagen en el formulario.
       * @param {File} file - Archivo de imagen redimensionado
       */
      function previewImage(file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block'; // Mostrar la previsualización
        };
        reader.readAsDataURL(file);
      }

      /**
       * Crea un objeto FileList con un solo archivo (redimensionado).
       * @param {File} file - Archivo redimensionado
       * @returns {FileList} - Nuevo FileList con el archivo
       */
      function createFileList(file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        return dataTransfer.files;
      }

      function copiarAlPortapapeles(elemento) {
        var temp = document.createElement("textarea");
        document.body.appendChild(temp);
        temp.value = elemento;
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

       /**
       * Función para validar que solo se ingresen caracteres numéricos (0-9).
       * Elimina cualquier caracter que no sea un dígito en tiempo real.
       * @param {HTMLInputElement} input - El elemento de entrada (input) a validar.
       */
      function validateNumericInput(input) {
        // Reemplaza cualquier caracter que NO sea un dígito (0-9) con una cadena vacía
        input.value = input.value.replace(/[^0-9]/g, '');
      }
   