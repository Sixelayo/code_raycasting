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
#define DEBUG(x) std::cout << x << "\n"



namespace gbl{
    GLuint vaoquad, vboquad;
}
namespace shader{
    GLuint vert_passthrouhg;
    GLuint frag_first_raytracing;
}


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
    glClearColor( 0.8f, 0.3f, 0.4f, 0.0f );

    DEBUG("loading quad ...");
    util::loadQuad(gbl::vaoquad, gbl::vboquad);
    
    /* Loop until the user closes the window */
    while (!glfwWindowShouldClose(window))
    {
        /* Render here */
        glClear(GL_COLOR_BUFFER_BIT);

        util::drawQuad(gbl::vaoquad);

        /* Swap front and back buffers */
        glfwSwapBuffers(window);
        
        /* Poll for and process events */
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}