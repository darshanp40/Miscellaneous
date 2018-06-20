// configuration object for jquery's fileInput plugin
var oConfigurationObjects = [
    {
        maxFileSize: 4000,
        allowedFileExtensions: ["pdf", "jpg", "png", "bmp", "gif"],
        msgInvalidFileExtension: "Invalid file type. Allowed file type are pdf, jpg, png, bmp, gif",
        msgSizeTooLarge: "The file exceeds 4mb limit",
        elErrorContainer: "#file-error",
        msgErrorClass:"doc-error-conf",
        showCaption: false
    }
];

/**
  * @description constructor for doc-upload plugin
  * @param {Integer} iConfigOption index of the object to be used from oConfigurationObjects
  * @param {Object} oPluginParameters object containing basic properties required for the doc-upload plugin
**/
var DocUploadPlugin = function(iConfigOption, oPluginParameters) {
    this.fileConfiguration = clone(oConfigurationObjects[iConfigOption]);
    this.fileConfiguration.elErrorContainer = '#' + oPluginParameters.containerID + '-file-error';
    this.containerID = oPluginParameters.containerID;
    this.files = [];
    this.counter = 0;
    this.isMultiFileSupport = oPluginParameters.isMultiFileSupport ? oPluginParameters.isMultiFileSupport : false;
    this.buttonTitle = oPluginParameters.buttonTitle ? oPluginParameters.buttonTitle : "Select Files";
    this.url = oPluginParameters.url ? oPluginParameters.url : "/app/documents/upload";
    this.requestType = oPluginParameters.requestType ? oPluginParameters.requestType : "1";
    this.customerId =  oPluginParameters.customerId;
    this.docStatus = oPluginParameters.docStatus ? oPluginParameters.docStatus : 0;
    this.docType = oPluginParameters.docType;
    this.leadId = oPluginParameters.leadId;
    this.lowticketredirect =  oPluginParameters.lowticketredirect ? oPluginParameters.lowticketredirect : "false";
    this.retryCount = oPluginParameters.retryCount ? oPluginParameters.retryCount : 1;
    this.successMethod = oPluginParameters.successFunction;
    this.failureMethod = oPluginParameters.failureFunction;
};

/**
  * @description function to create html for document upload
**/
DocUploadPlugin.prototype.appendHTML = function() {
    var html;

    html = '<div class="doc-upload-container">' +
                '<div class="selection-container">' +
                    '<div class="doc-div">' +
                        '<div class="loading-image-container hidden">' +
                            '<div class="loader"></div>' +
                        '</div>' +
                        '<i class="upload-image fa fa-cloud-upload"></i>' +
                        '<span>' + this.buttonTitle + '</span>' +
                        '<div class="file-container">' +
                            '<input type="file" name="addressproof[]" id="' + this.containerID + '-input" multiple class="inputFile" data-show-preview="false" data-show-remove="false" data-show-upload="false">' +
                        '</div>' +
                    '</div>' +
                    '<div class="doc-file-name">Allowed file types are ' + this.fileConfiguration.allowedFileExtensions.join(", ") + '</div>' +
                    '<div class="doc-file-name">Maximum file size is 4MB</div>' +
                    '<div class="doc-error" id="' + this.containerID + '-file-error"></div>' +
                    '<div class="file-type-error"></div>' +
                    '<div span class="doc-error doc-error-conf"></div>' +
                    '<div span class="doc-error-auto hidden">Something went wrong. Please upload the document again. </div>' +
                    '<div class="doc-files"></div>' +
                '</div>' +
            '</div>';
    $('#' + this.containerID).append(html);
    $('#' + this.containerID + '-input').fileinput(this.fileConfiguration);
    var obj = this;
    $('#' + this.containerID + '-input').change({pluginObject: this}, function(e) {
        var files = $(this)[0].files;
        e.data.pluginObject.counter = 0;
        if(files.length) {
            e.data.pluginObject.files = files;
            e.data.pluginObject.uploadFile();
        }
    });
};

/**
  * @description function to add loading icon on the button
**/
DocUploadPlugin.prototype.showLoading = function() {
    $("#" + this.containerID + " .loading-image-container").removeClass('hidden');
};

/**
  * @description function to remove loading icon from the button
**/
DocUploadPlugin.prototype.removeLoading = function() {
    $("#" + this.containerID + " .loading-image-container").addClass('hidden');
};

/**
  * @description function to trigger an ajax for uploading the file
**/
DocUploadPlugin.prototype.uploadFile = function() {
    var api_url = "/app/documents/upload";

    this.showLoading("plugin-container");
    $(".doc-error-auto").addClass("hidden");

    var data = new FormData($('formForFileUpload')[0]);
    data.append("leadId", this.leadId);
    data.append("filename", this.files[this.counter].name);
    data.append("requestType", this.requestType);
    data.append("customerId", this.customerId);
    data.append("docStatus", this.docStatus);    
    data.append("docType", this.docType);
    data.append(this.docType, this.files[this.counter]);
    data.append("lowticketredirect",this.lowticketredirect);
    
    $.ajax({
        context: this,
        url: api_url,
        data: data,
        type: 'POST',
        contentType: false,
        processData : false,
        success: this.successFunction,
        failure: this.failureFunction
    });
};

/**
  * @description function which executes on failure of the ajax in upload function
  * @param {Integer} error error code
**/
DocUploadPlugin.prototype.failureFunction = function(error) {
    this.removeLoading();
    if(mixpanel) {
        mixpanel.track(this.containerID + " error while uploading");
    }
    if(this.failureMethod) {
        this.failureMethod(error);
    }
}

/**
  * @description function which executes on success of the ajax in upload function
  * @param {Integer} data flags returned from the server
  * @param {String} textStatus status returned from the server 
**/
DocUploadPlugin.prototype.successFunction = function(data, textStatus) {
    if(parseInt(data) === 1) { // upload success
        this.appendFiles();
        if(this.isMultiFileSupport && (this.counter + 1) < this.files.length) {
            this.counter++;
            this.uploadFile();
        } else {
            if(mixpanel) {
                mixpanel.track(this.containerID + " Files uploaded successfully");
            }
            this.removeLoading();
            if(!this.isMultiFileSupport) {
                this.disableUploadButton();
            }
            if(this.successMethod) {
                this.successMethod(data, textStatus);
            }
        }
    } else if(parseInt(data) == 7 && this.retryCount > 0) {
        this.retryCount--;
        this.uploadFile();
        if(mixpanel) {
            mixpanel.track(this.containerID + " incomplete data while uploading");
        }
    } else {
        this.removeLoading();
        $(".doc-error-auto").removeClass("hidden");
        if(mixpanel) {
            mixpanel.track(this.containerID + " error while uploading");
        }
    }
    
};

DocUploadPlugin.prototype.disableUploadButton = function() {
    $('#' + this.containerID + " .inputFile").attr('disabled','disable');
    $('#' + this.containerID + " .btn-primary").addClass('disabled');
    $('#' + this.containerID + " .doc-div").addClass('disabled');
}

/**
  * @description appends the file recently uploaded to the list of uploaded files
**/
DocUploadPlugin.prototype.appendFiles = function() {
    var fileName = this.files[this.counter].name;
    $('#' + this.containerID + " .doc-files").prepend('<span><i class="fa fa-check"></i><div>' + fileName + '</div></span><br>');
};

/**
  * @description copy an object to another
  * @param {Object} obj object to be copied
  * @returns {Object} reference to the copy of the passed object
**/
function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}
