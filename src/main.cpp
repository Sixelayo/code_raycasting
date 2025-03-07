#include "glad/gl.h"
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <cmath>
#include <cstdio>
#include <vector>
#include <mutex>

#include "glm/ext/matrix_transform.hpp"
#include "glm/fwd.hpp"
#include "imgui_util.hpp"
#include "util_raytracing.hpp"
#define GLM_ENABLE_EXPERIMENTAL

#include <cstdlib>
#include <iostream>

#define GLAD_GL_IMPLEMENTATION // Necessary for headeronly version.

/**
 * Control (azerty)
 * zsqd move
 * , lock rota
 * n lookat 0
 * 
 * warning : camera control are kinda sus (may depends on distance, and moving doesn't change to)
 */


int main(int argc, char* argv[]) {
    //save seed so if we ever see smth rly cool we can reset it
    unsigned int seed = static_cast<unsigned int>(std::time(nullptr));
    std::srand(seed);
    /*
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--help") {
            std::cout << "usage :\n"
                << "\t--seed <s>\t\tset random seed (default : std::time(nullptr))\n"
                << "\t--nbpts <n>\t\tset number of points (default : " << 3 <<")\n";
            return 0;
        } else if (arg == "--seed") {
            if(i+1 == argc) return -1;
            seed = atoi(argv[i+1]);
        } else if (arg == "--nbpts") {
            if(i+1 == argc) return -1;
            //todo
        }
    }*/
    
    std::srand(seed);
    std::cout << "seed initialized : " << seed << std::endl;
    
    
    GLFWwindow* window;
    if (!glfwInit())
        return -1;
    
    /* Create a windowed mode window and its OpenGL context */
    window = glfwCreateWindow(980, 640, "GLFW CMake starter", NULL, NULL);
    if (!window){
        DEBUG("error loading window");
        glfwTerminate();
        return -1;
    }
    
    /* Make the window's context current */
    glfwMakeContextCurrent(window);
    if (!gladLoadGL(glfwGetProcAddress)) {
        DEBUG("error loading glad");
        return -1;
    }
    
    //init a bunch of things
    glClearColor( 0.8f, 0.3f, 0.4f, 0.0f );
    cbk::initCallback(window);
    camera.init(45,gbl::SCREEN_X, gbl::SCREEN_Y);
    util::loadQuad(gbl::vaoquad, gbl::vboquad);
    {//shaders initialisation
        shaders::vert_passthrouhg = loadshader("shaders/passthrough.vert", GL_VERTEX_SHADER);
        shaders::frag_first_raytracing = loadshader("shaders/raytracing.frag", GL_FRAGMENT_SHADER);
        prog::prog1 = createShaderProgram(shaders::vert_passthrouhg, shaders::frag_first_raytracing);
    }
    initIMGUI(window);


    /* Loop until the user closes the window */
    while (!glfwWindowShouldClose(window))
    {
        glClear(GL_COLOR_BUFFER_BIT);
        newframeIMGUI();
        camera.updtRUF();
        camera.moveFromKeyBoard(window);
        
        glUseProgram(prog::prog1);
        {//update uniform values
            glUniform2f(glGetUniformLocation(prog::prog1, "screen"), gbl::SCREEN_X, gbl::SCREEN_Y);
            
            //todo optim : uniform should be updated only when UI call for it !
            glUniform1i(glGetUniformLocation(prog::prog1, "shadingMode"), gbl::curr_mode);
            glUniform1f(glGetUniformLocation(prog::prog1, "dtoCam_min"), gbl::dtoCam_min);
            glUniform1f(glGetUniformLocation(prog::prog1, "dtoCam_max"), gbl::dtoCam_max);

            //todo optim : only when needed !
            glUniform4fv(glGetUniformLocation(prog::prog1, "spheres"), NB_SPHERE, glm::value_ptr(geo::spheres[0]));

            
            glUniform3fv(glGetUniformLocation(prog::prog1, "cam_pos"), 1, glm::value_ptr(camera.from));
            glUniform3fv(glGetUniformLocation(prog::prog1, "cam_right"), 1, glm::value_ptr(camera.right));
            glUniform3fv(glGetUniformLocation(prog::prog1, "cam_up"), 1, glm::value_ptr(camera.up));
            glUniform3fv(glGetUniformLocation(prog::prog1, "cam_forward"), 1, glm::value_ptr(camera.forward));
            glUniform1f(glGetUniformLocation(prog::prog1, "cam_distance"), camera.distance);
        }
        util::drawQuad(gbl::vaoquad);
        
        //ui
        ui::hw(camera);
        
        
        endframeIMGUI();
        multiViewportIMGUI(window);

        /* Swap front and back buffers */
        glfwSwapBuffers(window);
        
        /* Poll for and process events */
        glfwPollEvents();
    }

    shutdownIMGUI();
    glfwTerminate();
    return 0;
}