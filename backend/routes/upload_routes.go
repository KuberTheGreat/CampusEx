package routes

import (
	"context"
	"net/http"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
)

func RegisterUploadRoutes(router *gin.RouterGroup) {
	upload := router.Group("/upload")
	{
		upload.POST("", handleUpload)
	}
}

func handleUpload(c *gin.Context) {
	// Parse max 10MB
	err := c.Request.ParseMultipartForm(10 << 20)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file included in request"})
		return
	}
	defer file.Close()

	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	if cloudinaryURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cloudinary is not configured on the server"})
		return
	}

	cld, err := cloudinary.NewFromURL(cloudinaryURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize Cloudinary"})
		return
	}

	// Upload to cloudinary
	ctx := context.Background()
	resp, err := cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder: "campusex_evidence",
		// Auto-detect format type to support PDF/mp4 as well
		ResourceType: "auto",
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to Cloudinary: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"url":     resp.SecureURL,
	})
}
