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
#define NB_MAT 5

#define UIDT(txt, i) (std::string(txt) + std::string("##") + std::to_string(i)).c_str()

float randomInRange(float min, float max) {
    return min + static_cast<float>(rand()) / static_cast<float>(RAND_MAX) * (max - min);
}

enum ShadingMode{Normal, Position, distance_to_cam, Phong, Bling};
enum ShadowMode{None_shadow, Hard_shadow, Soft_shadow};

namespace gbl{
    GLuint vaoquad, vboquad;
    int SCREEN_X, SCREEN_Y;

    ShadingMode curr_mode = Phong;
    ShadowMode curr_shadow = None_shadow;
    int curr_scene = 0;
    float dtoCam_min =1.0f;
    float dtoCam_max = 5.0f;

    glm::vec3 light;
    glm::vec3 L_a, L_d, L_s;
    float* controlled; //a pointer to a float 3 that keyboard controls
}

namespace shaders{
    GLuint vert_passthrouhg;
    GLuint frag_first_raytracing;
}
namespace prog{
    GLuint prog1;
}
namespace mat{
    glm::vec3 KAs[NB_MAT];
    glm::vec3 KDs[NB_MAT];
    glm::vec3 KSs[NB_MAT];
    float Hs[NB_MAT]; //shininess
    float cReflects[NB_MAT]; //coef Reflections
    float cRefracts[NB_MAT]; //coef Refractions
    float Refrindexs[NB_MAT]; //index de refraction (par rapport à l'air ? à vérifier)

    void loadMat(){
        glUniform3fv(glGetUniformLocation(prog::prog1, "KAs"), NB_MAT, glm::value_ptr(KAs[0]));
        glUniform3fv(glGetUniformLocation(prog::prog1, "KDs"), NB_MAT, glm::value_ptr(KDs[0]));
        glUniform3fv(glGetUniformLocation(prog::prog1, "KSs"), NB_MAT, glm::value_ptr(KSs[0]));
        glUniform1fv(glGetUniformLocation(prog::prog1, "Hs"), NB_MAT, Hs);
    }
    
    void randomizes(){
        for(int i=0; i<NB_MAT; i++){
            KAs[i] = glm::vec3(randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f));
            KDs[i] = glm::vec3(randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f));
            KSs[i] = glm::vec3(randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f),randomInRange(0.0f,1.0f));
            Hs[i] = randomInRange(1.0f,256.0f);
        }
        //loadMat(); //useless cuz load every frame
    }
    void allwhite(){
        for(int i=0; i<NB_MAT; i++){
            KAs[i] = glm::vec3(1.0f);
            KDs[i] = glm::vec3(1.0f);
            KSs[i] = glm::vec3(1.0f);
        }
    }
    void setAllShine(int v){
        for(int i=0; i<NB_MAT; i++){
            Hs[i] = v;
        }
    }

    void uiMat(){
        //if(ImGui::Button("LoadMats")) loadMat();
        if(ImGui::Button("Allwhite mat")) allwhite();
        if(ImGui::Button("Randomize mat")) randomizes();
        static int shine = 1;
        ImGui::SliderInt("shine", &shine,0, 256); 
        if(ImGui::Button("set all shininess")) setAllShine(shine);
        for(int i=0; i<NB_MAT; i++){
            ImGui::Text(UIDT("Material : ", i));
            ImGui::ColorEdit3(UIDT("Ka", i), (float*)&KAs[i], ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
            ImGui::ColorEdit3(UIDT("Kd", i), (float*)&KDs[i], ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
            ImGui::ColorEdit3(UIDT("Ks", i), (float*)&KSs[i], ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
        }
    }

};

#define NB_SPHERE 8
#define NB_PLANE 3 
namespace geo{
    float xRange[2] = {-5.0f, 5.0f};
    float yRange[2] = {-5.0f, 5.0f};
    float zRange[2] = {-5.0f, 5.0f};
    float rRange[2] = {1.0f, 2.0f};

    glm::vec4 spheres[NB_SPHERE]; //a sphere is a vec4 => the first 3 are coordinate and last one is raidus
    glm::vec4 planes[NB_PLANE]; //xyz normal, w offset
    glm::vec3 tetrahedron[4];
    

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
    

    void init_tetra(){
        tetrahedron[0] = glm::vec3(0);
        tetrahedron[1] = glm::vec3(1,0,0);
        tetrahedron[2] = glm::vec3(0,0,1);
        tetrahedron[3] = glm::vec3(0,1,0);
    }
    
    void initGeo(){
        gbl::curr_scene = 1;
        glUniform1i(glGetUniformLocation(prog::prog1, "scene"), gbl::curr_scene);
        generate_random_spheres();
        init_plane();
        init_tetra();
    }

    void init_scene2(){
        gbl::curr_scene = 2;
        glUniform1i(glGetUniformLocation(prog::prog1, "scene"), gbl::curr_scene);
        planes[0] = glm::vec4(0,1,0,-7);
        planes[1] = glm::vec4(0,1,0,-8);
        planes[2] = glm::vec4(0,1,0,-9);
        for(int i=0; i< NB_PLANE; i++)
            normalize_plane(i);
        tetrahedron[0] = glm::vec3(-1,0,-1);
        tetrahedron[1] = glm::vec3(1,0,-1);
        tetrahedron[2] = glm::vec3(-1,0,1);
        tetrahedron[3] = glm::vec3(0,1,0);
        
        //scene 3 or idk
        //const float octo = 10;
        // spheres[0] = glm::vec4( 2 * octo, 3, -1 * octo, 2);
        // spheres[1] = glm::vec4( 2 * octo, 3, 1 * octo, 2);
        // spheres[2] = glm::vec4( 1 * octo, 3, 2 * octo, 2);
        // spheres[3] = glm::vec4( -1 * octo, 3, 2 * octo, 2);
        // spheres[4] = glm::vec4( -2 * octo, 3, 1 * octo, 2);
        // spheres[5] = glm::vec4( -2 * octo, 3, -1 * octo, 2);
        // spheres[6] = glm::vec4( -1 * octo, 3, -2 * octo, 2);
        // spheres[7] = glm::vec4( 1 * octo, 3, -2 * octo, 2);
        
        const float sep = 8;
        spheres[0] = glm::vec4( 2 * sep, 3, -2 * sep, 3); //100% reflective
        spheres[1] = glm::vec4( 1 * sep, 3, -1 * sep, 3); //100% refractive 
        spheres[2] = glm::vec4( -1 * sep, 3, 1 * sep, 3); //100% refractive (hollow)
        spheres[3] = glm::vec4( -1 * sep, 3, 1 * sep, 2.8);
        spheres[4] = glm::vec4( -2 * sep, 3, 2 * sep, 3); //50 - 50
        
        spheres[5] = glm::vec4( 1.5 * sep, 3+sep, -1.5 * sep, 3);
        spheres[6] = glm::vec4( 0 * sep, 3+sep, 0 * sep, 3);
        spheres[7] = glm::vec4( -1.5 * sep, 3+sep, 1.5 * sep, 3);

        //mat 0 : 100% reflective
        mat::cReflects[0] = 1.0f;
        mat::cRefracts[0] = 0.0;
        mat::Refrindexs[0] = 1.0f;

        //mat 1 : 100% refractive (outside)
        mat::cReflects[1] = 0.0f;
        mat::cRefracts[1] = 1.0;
        mat::Refrindexs[1] = 1.5f;

        //mat 2 : 100% refractive (inside)
        mat::cReflects[2] = 0.0f;
        mat::cRefracts[2] = 1.0;
        mat::Refrindexs[2] = 0.667f;

        //mat 3 : 50% / 50% refractive (inside)
        mat::cReflects[3] = 0.5f;
        mat::cRefracts[3] = 0.5f;
        mat::Refrindexs[3] = 1.5f;
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

    //some of the GPU memory that is updated only via UI need to be set the first time
    void sendToGPUOnce(){
        glUseProgram(prog::prog1);
        glUniform1i(glGetUniformLocation(prog::prog1, "shadingMode"), gbl::curr_mode);
        glUniform1i(glGetUniformLocation(prog::prog1, "shadowMode"), gbl::curr_shadow);        
        glUniform1i(glGetUniformLocation(prog::prog1, "scene"), gbl::curr_scene);        
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

        gbl::controlled = glm::value_ptr(from);
    }

    
    void moveY(float* ptr, float v){
        ptr[1] += ms*v;
    }
    void moveFoward(float* ptr, float v){
        glm::vec3 length = -forward*ms*v;
        ptr[0] += length.x;
        ptr[2] += length.z;
    }
    void moveSideways(float* ptr, float v){
        glm::vec3 length = right*ms*v;
        ptr[0] += length.x;
        ptr[2] += length.z;
    }
    //uses this instead of tracking held state (glfm only has pressed / released state)
    void moveFromKeyBoard(GLFWwindow* window, float* ptr){
        if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) moveFoward(ptr, 1.0f);
        if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) moveFoward(ptr, -1.0f);
        if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) moveSideways(ptr, -1.0f);
        if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) moveSideways(ptr, 1.0f);
        if (glfwGetKey(window,GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS) moveY(ptr, -1.0f);
        if (glfwGetKey(window,GLFW_KEY_SPACE) == GLFW_PRESS) moveY(ptr, 1.0f);
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
        if (key == GLFW_KEY_C && action == GLFW_PRESS)
            gbl::controlled = glm::value_ptr(camera.from);
        if (key == GLFW_KEY_X && action == GLFW_PRESS)
            gbl::controlled = glm::value_ptr(gbl::light);

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
// ----------------------------------------------- LIGHTS -----------------------------------------------------------------

            const char* item_cmb1[] =  {"Normal", "Position", "distance to Cam", "Phong", "Bling"};
            if(ImGui::Combo("Shading : ", (int*)&gbl::curr_mode, item_cmb1, IM_ARRAYSIZE(item_cmb1))){
                glUniform1i(glGetUniformLocation(prog::prog1, "shadingMode"), gbl::curr_mode);
            }
            if(gbl::curr_mode == distance_to_cam){
                ImGui::SliderFloat("dist_min", &gbl::dtoCam_min, 0.0f, 20.0f);
                ImGui::SliderFloat("dist_max", &gbl::dtoCam_max, 0.0f, 20.0f);
            }
            const char* item_cmb2[] =  {"None", "Hard", "Soft"};
            if(ImGui::Combo("Shadow mode : ", (int*)&gbl::curr_shadow, item_cmb2, IM_ARRAYSIZE(item_cmb2))){
                glUniform1i(glGetUniformLocation(prog::prog1, "shadowMode"), gbl::curr_shadow);
            }

            ImGui::Separator();

            ImGui::InputFloat3("Light pos", &gbl::light[0]);
            ImGui::ColorEdit3("La", (float*)&gbl::L_a, ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
            ImGui::ColorEdit3("Ld", (float*)&gbl::L_d, ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
            ImGui::ColorEdit3("Ls", (float*)&gbl::L_s, ImGuiColorEditFlags_Float | ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_DisplayRGB);
            
// ----------------------------------------------- MATERIAL -----------------------------------------------------------------
            if(ImGui::TreeNode("Materials list")){
                mat::uiMat();
                HelpMarker("useless as of know, already sent per frame");
                ImGui::TreePop();
            }
        }
// ----------------------------------------------- GEOMETRY -----------------------------------------------------------------
        if(ImGui::CollapsingHeader("Geometry", ImGuiTreeNodeFlags_DefaultOpen)){
            if(ImGui::Button("scene 1")) geo::initGeo();
            ImGui::SameLine();
            if(ImGui::Button("scene 2")) geo::init_scene2();

            if(ImGui::TreeNode("spheres")){
                static int focus_i=0;
                ImGui::SliderInt("focus index", &focus_i,0, NB_SPHERE-1); //warning : arbitrary memory access lol
                if(ImGui::Button("focus##sphere")) gbl::controlled = glm::value_ptr(geo::spheres[focus_i]);
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
            if(ImGui::TreeNode("tetra")){
                if(ImGui::Button("gen##planes")) geo::init_tetra();
                ImGui::DragFloat3("pA", &geo::tetrahedron[0][0]);
                    ImGui::SameLine(); if(ImGui::Button("focus##tetra1")) gbl::controlled = glm::value_ptr(geo::tetrahedron[0]);
                ImGui::DragFloat3("pB", &geo::tetrahedron[1][0]);
                    ImGui::SameLine(); if(ImGui::Button("focus##tetra2")) gbl::controlled = glm::value_ptr(geo::tetrahedron[1]);
                ImGui::DragFloat3("pC", &geo::tetrahedron[2][0]);
                    ImGui::SameLine(); if(ImGui::Button("focus##tetra3")) gbl::controlled = glm::value_ptr(geo::tetrahedron[2]);
                ImGui::DragFloat3("pD", &geo::tetrahedron[3][0]);
                    ImGui::SameLine(); if(ImGui::Button("focus##tetra4")) gbl::controlled = glm::value_ptr(geo::tetrahedron[3]);

                ImGui::TreePop();
            }
        }

        ImGui::End();
    }
}

