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


enum ShadingMode{Normal, Position, distance_to_cam};

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

namespace cbk{
    void onResize(GLFWwindow* window, int width, int height) {
        glViewport(0, 0, width, height);  // Adjust OpenGL viewport
        gbl::SCREEN_X = width;
        gbl::SCREEN_Y = height;
    }

    void initCallback(GLFWwindow* window){
        glfwSetFramebufferSizeCallback(window, onResize);

        //first init window size
        glfwGetWindowSize(window, &gbl::SCREEN_X, &gbl::SCREEN_Y);
    }
}

class Camera{
public:
    //param
    float fovy;
    float sy;
    glm::vec3 from;
    glm::vec3 to;
    
    //readonly
    float distance;
    glm::vec3 forward, right, up;

    void updtRUF(){
        forward = glm::normalize(from - to);
        right = glm::normalize(glm::cross(glm::vec3(0,1,0),forward));
        up = glm::cross(forward, right);
        distance = sy / tan(glm::radians(fovy/2));
    }
    void updtSy(int width, int height){
        sy = 2.0f / (width < height ? (float)width/(float)height : 1.0f);
    }
    void init(float fov, int width, int height){
        fovy = fov;
        updtSy(width, height);
        from = glm::vec3(1.0f);
        to = glm::vec3(0.0f);
    }
};
Camera camera;


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
            const char* item_cmb1[] =  {"Normal", "Position", "distance to Cam"};
            if(ImGui::Combo("Shading : ", (int*)&gbl::curr_mode, item_cmb1, IM_ARRAYSIZE(item_cmb1))){
            }
            if(gbl::curr_mode == distance_to_cam){
                ImGui::SliderFloat("dist_min", &gbl::dtoCam_min, 0.0f, 20.0f);
                ImGui::SliderFloat("dist_max", &gbl::dtoCam_max, 0.0f, 20.0f);
            }
        }

        ImGui::End();
    }
}

