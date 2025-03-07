#pragma once

#include <string>
#include <fstream>
#include <cstdlib>
#include <iostream>
#include <glad/gl.h>
#include "opengl_util.h"
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

#define M_PI 3.14159265358979323846
#define DEBUG(x) std::cout << x << "\n"


enum ShadingMode{Normal, Position, distance_to_cam, Materials};

namespace gbl{
    GLuint vaoquad, vboquad;
    int SCREEN_X, SCREEN_Y;

    ShadingMode curr_mode = Normal;
    float dtoCam_min =1.0f;
    float dtoCam_max = 5.0f;
}
namespace shaders{
    GLuint vert_passthrouhg;
    GLuint frag_first_raytracing;
}
namespace prog{
    GLuint prog1;
}

#define NB_SPHERE 8
#define NB_PLANE 3 
namespace geo{
    float xRange[2] = {-5.0f, 5.0f};
    float yRange[2] = {-5.0f, 5.0f};
    float zRange[2] = {-5.0f, 5.0f};
    float rRange[2] = {1.0f, 2.0f};

    glm::vec4 spheres[NB_SPHERE]; //a sphere is a vec4 => the first 3 are coordinate and last one is raidus
    glm::vec4 planes[NB_PLANE]; //xyz normal, w offset

    float randomInRange(float min, float max) {
        return min + static_cast<float>(rand()) / static_cast<float>(RAND_MAX) * (max - min);
    }

    void generate_random_spheres(){
        for (int i = 0; i < NB_SPHERE; ++i) {
            float x = randomInRange(xRange[0], xRange[1]);
            float y = randomInRange(yRange[0], yRange[1]);
            float z = randomInRange(zRange[0], zRange[1]);
            float radius = randomInRange(rRange[0], rRange[1]);

            spheres[i] = glm::vec4(x, y, z, radius);
        }
    }
    void normalize_plane(int i){
        planes[i] = glm::vec4(glm::normalize(glm::vec3(planes[i])),planes[i].w);
    }
    void init_plane(){
        planes[0] = glm::vec4(0,1,0,-7);
        planes[1] = glm::vec4(1,0,0,-7);
        planes[2] = glm::vec4(0,0,1,-7);
        for(int i=0; i< NB_PLANE; i++)
            normalize_plane(i);
    }
    


} //end namespace geo


namespace util{
    void loadQuad(GLuint& vao, GLuint& vbo){
        glGenVertexArrays(1, &vao);
        glBindVertexArray(vao);
        const GLfloat vertices[] =
            { -1.0f, 1.0f, -1.0f, -1.0f, 1.0f, 1.0f, 1.0f, -1.0f };
        glGenBuffers(1, &vbo);
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, 0);
        glEnableVertexAttribArray(0);
    }

    void drawQuad(GLuint& vao){
        glBindVertexArray(vao);
        glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    }

}



class Camera{
public:
    bool lockdir;
    // Add these for mouse control
    float lastX = 400.0f;  // Initial mouse X (assuming 800x600 window)
    float lastY = 300.0f;  // Initial mouse Y
    float sensitivity = 0.1f;  // Mouse sensitivity

    //param
    float fovy;
    float sy;
    glm::vec3 from;
    glm::vec3 to;
    float ms; //movespeed
    float sensivity; //rotate sensi
    
    //readonly
    float distance;
    glm::vec3 forward, right, up;


    //mouse control 

    void updtRUF(){
        forward = glm::normalize(from - to);
        right = glm::normalize(glm::cross(glm::vec3(0,1,0),forward));
        //up = glm::cross(forward, right);
        up = glm::cross(glm::normalize(glm::vec3(forward.x, 0.0f, forward.z)), right);
        distance = sy / tan(glm::radians(fovy/2));
    }
    void updtSy(int width, int height){
        sy = 1.0f / (width < height ? (float)width/(float)height : 1.0f);
    }
    void init(float fov, int width, int height){
        fovy = fov;
        updtSy(width, height);
        from = glm::vec3(10.0f);
        to = glm::vec3(0.0f);
        ms = 0.1;
        sensitivity = 0.075f;
        lockdir = false;
        lastX = width/2;
        lastY = height/2;
    }

    
    void moveY(float v){
        from.y += ms*v;
    }
    void moveFoward(float v){
        glm::vec3 length = -forward*ms*v;
        from.x += length.x;
        from.z += length.z;
    }
    void moveSideways(float v){
        glm::vec3 length = right*ms*v;
        from.x += length.x;
        from.z += length.z;
    }
    //uses this instead of tracking held state (glfm only has pressed / released state)
    void moveFromKeyBoard(GLFWwindow* window){
        if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) moveFoward(1.0f);
        if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) moveFoward(-1.0f);
        if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) moveSideways(-1.0f);
        if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) moveSideways(1.0f);
        if (glfwGetKey(window,GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS) moveY(-1.0f);
        if (glfwGetKey(window,GLFW_KEY_SPACE) == GLFW_PRESS) moveY(1.0f);
    }
    void rotateLook(double xpos, double ypos){
        if(lockdir) return;

        float xoffset = xpos - lastX;
        float yoffset = ypos - lastY;

        to += sensitivity * xoffset *right;
        to -= sensitivity * yoffset * glm::vec3(0.0f,1.0f,0.0f);


        lastX = xpos; lastY = ypos;
    }

};
Camera camera;

namespace cbk{
    void onResize(GLFWwindow* window, int width, int height) {
        glViewport(0, 0, width, height);  // Adjust OpenGL viewport
        gbl::SCREEN_X = width;
        gbl::SCREEN_Y = height;
    }

    void onKey(GLFWwindow* window, int key, int scancode, int action, int mods){
        //...only presed / released event usualy boolean switch

        //M is comma on azerty
        if (key == GLFW_KEY_M && action == GLFW_PRESS)
            camera.lockdir = !camera.lockdir;
        if (key == GLFW_KEY_N && action == GLFW_PRESS)
            camera.to = glm::vec3(0.0f);

    }

    void onCursor(GLFWwindow* window, double xpos, double ypos) {
        // should store camera in glfw user pointer
        camera.rotateLook(xpos, ypos); 
   
    }


    void initCallback(GLFWwindow* window){
        glfwSetFramebufferSizeCallback(window, onResize);
        glfwSetKeyCallback(window, onKey);
        glfwSetCursorPosCallback(window, onCursor);


        //first init window size
        glfwGetWindowSize(window, &gbl::SCREEN_X, &gbl::SCREEN_Y);
    }
}


namespace ui{
    void hw(Camera& cam){
        ImGui::Begin("Camera info");
        if(ImGui::CollapsingHeader("camera", ImGuiTreeNodeFlags_DefaultOpen)){
            ImGui::SliderFloat("Field of View", &cam.fovy, 10.0f, 180.0f);
            ImGui::Text("Scale Y: %.2f", cam.sy);
            ImGui::InputFloat3("From", &cam.from[0]);
            ImGui::InputFloat3("To", &cam.to[0]);
            ImGui::Text("Distance: %.2f", cam.distance);
            ImGui::Text("Forward: (%.2f, %.2f, %.2f)", cam.forward.x, cam.forward.y, cam.forward.z);
            ImGui::Text("Right: (%.2f, %.2f, %.2f)", cam.right.x, cam.right.y, cam.right.z);
            ImGui::Text("Up: (%.2f, %.2f, %.2f)", cam.up.x, cam.up.y, cam.up.z);
        }
        if(ImGui::CollapsingHeader("Shading mode", ImGuiTreeNodeFlags_DefaultOpen)){
            const char* item_cmb1[] =  {"Normal", "Position", "distance to Cam", "Materials"};
            if(ImGui::Combo("Shading : ", (int*)&gbl::curr_mode, item_cmb1, IM_ARRAYSIZE(item_cmb1))){
            }
            if(gbl::curr_mode == distance_to_cam){
                ImGui::SliderFloat("dist_min", &gbl::dtoCam_min, 0.0f, 20.0f);
                ImGui::SliderFloat("dist_max", &gbl::dtoCam_max, 0.0f, 20.0f);
            }
        }
        if(ImGui::CollapsingHeader("Geometry", ImGuiTreeNodeFlags_DefaultOpen)){
            if(ImGui::TreeNode("spheres")){
                if(ImGui::Button("gen##spheres")) geo::generate_random_spheres();
                ImGui::DragFloat2("X Range", geo::xRange, 0.1f, -20.0f, 20.0f, "%.1f");
                ImGui::DragFloat2("Y Range", geo::yRange, 0.1f, -20.0f, 20.0f, "%.1f");
                ImGui::DragFloat2("Z Range", geo::zRange, 0.1f, -20.0f, 20.0f, "%.1f");
                ImGui::DragFloat2("Radius Range", geo::rRange, 0.1f, 0.0f, 50.0f, "%.1f");
                ImGui::TreePop();
            }
            if(ImGui::TreeNode("planes")){
                if(ImGui::Button("gen##planes")) geo::init_plane();
                for(int i =0; i< NB_PLANE; i++){
                    ImGui::DragFloat4(("##planeinfo"+std::to_string(i)).c_str(), &geo::planes[i][0]);
                    ImGui::SameLine(); if(ImGui::Button(("normalize##foo"+std::to_string(i)).c_str())) geo::normalize_plane(i);
                }

                ImGui::TreePop();
            }
        }

        ImGui::End();
    }
}

