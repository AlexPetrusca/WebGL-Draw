#ifdef GL_ES
precision highp float;
#endif

attribute vec3 a_Position; // Position of vertex
attribute vec4 a_Color; // color of vertex
attribute vec3 a_Normal; // normal of vertex (NOT NORMALIZED)

uniform mat4 u_ModelMatrix; // affine transformation matrix
uniform mat4 u_NormalMatrix; // normal transformation matrix
uniform mat4 u_ViewMatrix; // view matrix
uniform mat4 u_ProjMatrix; // projection matrix

uniform vec3 u_LightColor; // light color
uniform vec3 u_LightPosition; // light position
uniform float u_ShadingStyle; // shading style
uniform float u_Selected_Click; // click highlight selection

uniform vec3 u_AmbientColor; // ambient
uniform vec3 u_SpecularColor; // specular
uniform float u_SpecularConstant; // specular constant
uniform float u_Light; // specific light shading

varying vec3 v_Position; // Position to be passed to fragment shader
varying vec4 v_Color; // Color to be passed to fragment shader
varying vec3 v_Normal; // Normal to be passed to fragment shader

void main() {
    if (u_ShadingStyle == 0.0 || a_Normal == vec3(1.0)) {
        gl_Position = vec4(a_Position, 1);
        v_Color = a_Color;
        v_Normal = a_Normal;
    } else if(u_ShadingStyle == 1.0) {
        v_Position = vec3(u_ModelMatrix * vec4(a_Position, 1.0));
        gl_Position = u_ProjMatrix * u_ViewMatrix * vec4(v_Position, 1.0);
        v_Normal = vec3(u_NormalMatrix * vec4(a_Normal, 1.0));

        // ambient
        vec3 ambient = u_AmbientColor;

        // diffuse
        vec3 norm = normalize(v_Normal);
        vec3 lightDir = normalize(vec3(v_Position.xy - u_LightPosition.xy, 0.66));
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * vec3(a_Color);

        // specular
        vec3 viewDir = vec3(0.0, 0.0, -1.0);
        vec3 reflectDir = reflect(lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_SpecularConstant);
        vec3 specular = spec * u_SpecularColor;

        // final color calculation
        v_Color = vec4(ambient + diffuse + specular, a_Color.a);
    } else if(u_ShadingStyle >= 2.0) {
        v_Position = vec3(u_ModelMatrix * vec4(a_Position, 1.0));
        gl_Position = u_ProjMatrix * u_ViewMatrix * vec4(v_Position, 1.0);
        v_Normal = vec3(u_NormalMatrix * vec4(a_Normal, 1.0));
        v_Color = a_Color;
    }
}
