<?php

class ProjectTest extends PHPUnit\Framework\TestCase
{
    private $valid_projectID = "projectID45c225f598e32";
    private $valid_page_image = "001.png";

    //------------------------------------------------------------------------
    // projectID validation

    public function test_validate_projectID_positive_path()
    {
        validate_projectID($this->valid_projectID);

        // PHPUnit labels tests without at least one assert as risky
        $this->assertTrue(true);
    }

    public function test_validate_projectID_negative_path()
    {
        $this->expectException(InvalidProjectIDException::class);
        validate_projectID("1234");
    }

    public function test_get_projectID_param_positive_path()
    {
        $params = [
            "projectid" => $this->valid_projectID,
        ];
        $projectid = get_projectID_param($params, "projectid");
        $this->assertEquals($this->valid_projectID, $projectid);
    }

    public function test_get_projectID_param_null_positive_path()
    {
        $params = [];
        $projectid = get_projectID_param($params, "projectid", true);
        $this->assertEquals(null, $projectid);
    }

    public function test_get_projectID_param_null_negative_path()
    {
        $this->expectException(InvalidProjectIDException::class);
        $params = [];
        $projectid = get_projectID_param($params, "projectid");
    }

    //------------------------------------------------------------------------
    // page image validation

    public function test_validate_page_image_positive_path()
    {
        validate_page_image($this->valid_page_image);

        // PHPUnit labels tests without at least one assert as risky
        $this->assertTrue(true);
    }

    public function test_validate_page_image_negative_path()
    {
        $this->expectException(InvalidPageException::class);
        validate_page_image("1234");
    }

    public function test_get_page_image_param_positive_path()
    {
        $params = [
            "image" => $this->valid_page_image,
        ];
        $image = get_page_image_param($params, "image");
        $this->assertEquals($this->valid_page_image, $image);
    }

    public function test_get_page_image_param_null_positive_path()
    {
        $params = [];
        $image = get_page_image_param($params, "image", true);
        $this->assertEquals(null, $image);
    }

    public function test_get_page_image_param_null_negative_path()
    {
        $this->expectException(InvalidPageException::class);
        $params = [];
        $image = get_page_image_param($params, "image");
    }
}
